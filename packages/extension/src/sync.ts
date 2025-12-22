import * as vscode from 'vscode'
import * as zlib from 'zlib'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'
import {
    getUnsyncedCommits,
    getUnsyncedCommitsCursor,
    markCommitsSynced,
    markCommitsSyncing,
    markCommitsSyncedWithTimestamp,
    markCommitsFailed,
    resetSyncingCommits,
    updateRepoSyncSha,
    getRepoById,
    addToSyncQueue,
    updateSyncQueueAttempt,
    removeSyncQueueItem,
    getPendingSyncQueue,
    acquireSyncLock,
    releaseSyncLock,
    getSyncStats
} from './db'
import { NotificationManager, SyncStatus } from './notifications'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

export interface SyncConfig {
    enabled: boolean
    apiUrl: string
    chunkSize: number
    maxRetries: number
    retryDelays: number[]
}

export interface DeltaPayload {
    repo: {
        id: number
        name: string
        remote: string | null
        path: string
    }
    commits: Array<{
        sha: string
        author_name: string
        author_email: string | null
        author_email_hash: string
        date: string
        message: string
        category: string
        files: string[]
        components: string[]
        diff_summary?: string
        context_tags: string[]
    }>
    client_metadata: {
        client_id: string
        platform: string
        version: string
    }
}

export interface SyncResponse {
    synced: number
    synced_shas: string[]  // Server-confirmed SHA list
    rejected: Array<{ sha: string; reason: string }>
    last_synced_sha: string
    server_timestamp: string
    errors?: Array<{ sha: string; error: string }>
}

export class SyncManager {
    private context: vscode.ExtensionContext
    private output: vscode.OutputChannel
    private config: SyncConfig
    private syncTimer: NodeJS.Timeout | null = null
    private notificationManager: NotificationManager | null = null

    constructor(context: vscode.ExtensionContext, output: vscode.OutputChannel, notificationManager?: NotificationManager) {
        this.context = context
        this.output = output
        this.config = this.loadConfig()
        this.notificationManager = notificationManager || null
    }

    private loadConfig(): SyncConfig {
        const vscodeConfig = vscode.workspace.getConfiguration('commitDiary')

        // Use hardcoded API URL (setting removed from package.json to hide from UI)
        const apiUrl = 'http://localhost:3001'

        this.output?.appendLine(`[Sync] Using API URL: ${apiUrl}`)

        return {
            enabled: vscodeConfig.get<boolean>('sync.enabled', true),
            apiUrl,
            chunkSize: vscodeConfig.get<number>('sync.chunkSize', 200),
            maxRetries: 3,
            retryDelays: [2000, 4000, 8000] // Exponential backoff: 2s, 4s, 8s
        }
    }

    async buildDeltaPayload(repoId: number, commits?: any[]): Promise<DeltaPayload | null> {
        const repo = getRepoById(repoId)
        if (!repo) {
            this.output.appendLine(`[Sync] Repository ${repoId} not found`)
            return null
        }

        // Use provided commits or fetch unsynced commits
        const unsyncedCommits = commits || getUnsyncedCommits(repoId, this.config.chunkSize)

        if (unsyncedCommits.length === 0) {
            this.output.appendLine(`[Sync] No unsynced commits for repo ${repo.name}`)
            return null
        }

        // Get extension version
        const extension = vscode.extensions.getExtension('samuel-adedigba.commitdiary-extension')
        const version = extension?.packageJSON?.version || '0.0.0'

        // Get or create client ID
        let clientId = this.context.globalState.get<string>('clientId')
        if (!clientId) {
            clientId = this.generateClientId()
            await this.context.globalState.update('clientId', clientId)
        }

        const payload: DeltaPayload = {
            repo: {
                id: repoId,
                name: repo.name as string,
                remote: repo.remote as string | null,
                path: repo.path as string
            },
            commits: unsyncedCommits.map((row: any) => ({
                sha: row[0],
                author_name: row[2],
                author_email: row[3],
                author_email_hash: row[4],
                date: row[5],
                message: row[6],
                category: row[7],
                files: JSON.parse(row[8] || '[]'),
                components: JSON.parse(row[9] || '[]'),
                diff_summary: row[10],
                context_tags: JSON.parse(row[11] || '[]')
            })),
            client_metadata: {
                client_id: clientId,
                platform: process.platform,
                version
            }
        }

        this.output.appendLine(`[Sync] Built delta payload: ${payload.commits.length} commits for ${repo.name}`)

        return payload
    }

    async compressPayload(payload: DeltaPayload): Promise<Buffer> {
        const json = JSON.stringify(payload)
        const compressed = await gzip(Buffer.from(json, 'utf-8'))

        const compressionRatio = ((1 - compressed.length / json.length) * 100).toFixed(1)
        this.output.appendLine(`[Sync] Compressed ${json.length} bytes → ${compressed.length} bytes (${compressionRatio}% reduction)`)

        return compressed
    }

    async syncToCloud(repoId: number, forceFullResync = false): Promise<boolean> {
        this.output.appendLine(`[Sync] Starting sync for repo ${repoId}`)

        // Try to acquire sync lock
        if (!acquireSyncLock(repoId, this.context)) {
            this.output.appendLine('[Sync] ⏸️  Another sync is already in progress for this repo')
            return false
        }

        const batchId = uuidv4()
        this.output.appendLine(`[Sync] 🔒 Acquired sync lock. Batch ID: ${batchId}`)

        try {
            // Get auth token
            const token = await this.getAuthToken()
            if (!token) {
                this.output.appendLine('[Sync] No auth token found')
                vscode.window.showWarningMessage('CommitDiary: Please login to enable cloud sync.')
                return false
            }

            // Get unsynced commits
            const unsyncedCommits = getUnsyncedCommits(repoId, this.config.chunkSize)
            
            if (unsyncedCommits.length === 0) {
                this.output.appendLine('[Sync] ✅ No unsynced commits')
                return true
            }

            const totalCommits = unsyncedCommits.length
            this.output.appendLine(`[Sync] Found ${totalCommits} unsynced commits`)

            // Notify sync start
            await this.notificationManager?.notifySyncStart(totalCommits)

            // Get sync stats
            const stats = getSyncStats(repoId)
            this.output.appendLine(`[Sync] Sync stats: ${JSON.stringify(stats)}`)

            // Extract SHAs and mark as syncing
            const shas = unsyncedCommits.map((row: any) => row[0] as string)
            markCommitsSyncing(shas, batchId, this.context)
            this.output.appendLine(`[Sync] Marked ${shas.length} commits as 'syncing'`)

            // Build delta payload using the already-fetched commits
            const payload = await this.buildDeltaPayload(repoId, unsyncedCommits)
            if (!payload) {
                resetSyncingCommits(batchId, this.context)
                return false
            }

            // Compress payload
            const compressed = await this.compressPayload(payload)

            // Send to API with retry and progress reporting
            const response = await this.notificationManager?.showProgress(
                `Syncing ${totalCommits} commits...`,
                async (progress) => {
                    progress.report({ increment: 0, message: 'Uploading...' })
                    const result = await this.sendWithRetry(compressed, token)
                    progress.report({ increment: 100, message: 'Complete!' })
                    return result
                }
            ) || await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `CommitDiary: Syncing ${totalCommits} commits...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Uploading...' })
                const result = await this.sendWithRetry(compressed, token)
                progress.report({ increment: 100, message: 'Complete!' })
                return result
            })

            if (response) {
                // Use server-confirmed SHAs if available, otherwise use all sent SHAs
                const confirmedShas = response.synced_shas && response.synced_shas.length > 0 
                    ? response.synced_shas 
                    : shas

                // Mark confirmed commits as synced with server timestamp
                markCommitsSyncedWithTimestamp(confirmedShas, response.server_timestamp, this.context)
                this.output.appendLine(`[Sync] ✅ Marked ${confirmedShas.length} commits as 'synced'`)

                // Handle rejected commits
                if (response.rejected && response.rejected.length > 0) {
                    const rejectedShas = response.rejected.map(r => r.sha)
                    const rejectedReasons = response.rejected.map(r => `${r.sha}: ${r.reason}`).join(', ')
                    markCommitsFailed(rejectedShas, rejectedReasons, this.context)
                    this.output.appendLine(`[Sync] ⚠️  ${rejectedShas.length} commits rejected: ${rejectedReasons}`)
                }

                // Update repo sync SHA to the last successfully synced commit
                const lastSha = confirmedShas[confirmedShas.length - 1]
                updateRepoSyncSha(repoId, lastSha, this.context)

                this.output.appendLine(`[Sync] ✅ Successfully synced ${response.synced} commits`)

                // Notify sync complete
                const rejectedCount = response.rejected?.length || 0
                await this.notificationManager?.notifySyncComplete(response.synced, rejectedCount)

                // Send telemetry if enabled
                await this.sendTelemetry('sync_success', {
                    repo_id: repoId,
                    commit_count: response.synced,
                    compressed_size: compressed.length,
                    batch_id: batchId
                })

                return true
            }

            // If no response, reset commits to pending
            resetSyncingCommits(batchId, this.context)
            return false

        } catch (error) {
            this.output.appendLine(`[Sync] ❌ Error: ${error}`)

            // Reset commits from syncing to pending on error
            resetSyncingCommits(batchId, this.context)

            // Determine if we'll retry and when
            const willRetry = true
            const retryDelay = this.config.retryDelays[0] // First retry delay
            
            // Check if this is a network error (offline)
            const errorMessage = String(error)
            const isNetworkError = errorMessage.includes('fetch failed') || 
                                  errorMessage.includes('ECONNREFUSED') ||
                                  errorMessage.includes('ETIMEDOUT') ||
                                  errorMessage.includes('network')
            
            if (isNetworkError) {
                // Notify offline/queued status
                const statsResult = getSyncStats(repoId)
                const pendingCount = statsResult.find((row: any) => row[0] === 'pending')?.[1] || 0
                await this.notificationManager?.notifyOfflineQueued(pendingCount as number)
            } else {
                // Notify sync failed
                await this.notificationManager?.notifySyncFailed(errorMessage, willRetry, retryDelay)
            }

            // Send telemetry for failure
            await this.sendTelemetry('sync_failure', {
                repo_id: repoId,
                error: String(error),
                batch_id: batchId
            })

            // Add to sync queue for retry
            const payload = await this.buildDeltaPayload(repoId)
            if (payload) {
                addToSyncQueue(repoId, JSON.stringify(payload), this.context)
                this.output.appendLine('[Sync] Added failed sync to retry queue')
            }

            return false
        } finally {
            // Always release sync lock
            releaseSyncLock(repoId, this.context)
            this.output.appendLine('[Sync] 🔓 Released sync lock')
        }
    }

    private async sendWithRetry(compressed: Buffer, token: string, attempt = 0): Promise<SyncResponse | null> {
        try {
            const url = `${this.config.apiUrl}/v1/ingest/commits`
            this.output.appendLine(`[Sync] Attempt ${attempt + 1}/${this.config.maxRetries}: POST ${url}`)
            this.output.appendLine(`[Sync] Payload size: ${compressed.length} bytes`)
            this.output.appendLine(`[Sync] Auth token: ${token.substring(0, 15)}...`)

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-API-Key': token,
                    'Content-Type': 'application/gzip',
                    'Content-Encoding': 'gzip',
                    'X-Client-Version': vscode.extensions.getExtension('samuel-adedigba.commitdiary-extension')?.packageJSON?.version || '0.0.0'
                },
                body: compressed
            })

            this.output.appendLine(`[Sync] Response status: ${response.status}`)

            if (!response.ok) {
                const errorText = await response.text()
                this.output.appendLine(`[Sync] Error response: ${errorText}`)
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data = await response.json() as SyncResponse
            this.output.appendLine(`[Sync] ✅ Success: ${JSON.stringify(data)}`)
            return data

        } catch (error: any) {
            this.output.appendLine(`[Sync] ❌ Request failed: ${error.message}`)

            // Log detailed error information
            if (error.cause) {
                this.output.appendLine(`[Sync] Error cause: ${JSON.stringify(error.cause)}`)
            }
            if (error.stack) {
                this.output.appendLine(`[Sync] Stack trace: ${error.stack.split('\n').slice(0, 3).join('\n')}`)
            }

            if (attempt < this.config.maxRetries - 1) {
                const delay = this.config.retryDelays[attempt]
                this.output.appendLine(`[Sync] Retry ${attempt + 1}/${this.config.maxRetries} after ${delay}ms...`)

                await new Promise(resolve => setTimeout(resolve, delay))
                return this.sendWithRetry(compressed, token, attempt + 1)
            }

            throw error
        }
    }

    async processSyncQueue(): Promise<void> {
        // Reload config to ensure we have the latest API URL
        this.config = this.loadConfig()

        const queue = getPendingSyncQueue()

        if (queue.length === 0) {
            return
        }

        this.output.appendLine(`[Sync] Processing ${queue.length} items from sync queue`)
        this.output.appendLine(`[Sync] Using API URL: ${this.config.apiUrl}`)

        const token = await this.getAuthToken()
        if (!token) {
            this.output.appendLine('[Sync] No auth token, skipping queue processing')
            return
        }

        for (const item of queue) {
            const queueId = item[0] as number
            const repoId = item[1] as number
            const commitsJson = item[2] as string
            const payloadSize = item[3] as number
            const attemptCount = item[4] as number

            // Try to acquire lock
            if (!acquireSyncLock(repoId, this.context)) {
                this.output.appendLine(`[Sync] Queue item ${queueId}: Repo ${repoId} is locked, skipping`)
                continue
            }

            const batchId = uuidv4()

            try {
                const payload = JSON.parse(commitsJson) as DeltaPayload
                
                // Mark as syncing
                const shas = payload.commits.map(c => c.sha)
                markCommitsSyncing(shas, batchId, this.context)
                
                const compressed = await this.compressPayload(payload)

                const response = await this.sendWithRetry(compressed, token)

                if (response) {
                    // Success - remove from queue
                    removeSyncQueueItem(queueId, this.context)

                    // Use server-confirmed SHAs
                    const confirmedShas = response.synced_shas && response.synced_shas.length > 0
                        ? response.synced_shas
                        : shas

                    markCommitsSyncedWithTimestamp(confirmedShas, response.server_timestamp, this.context)

                    // Handle rejected commits
                    if (response.rejected && response.rejected.length > 0) {
                        const rejectedShas = response.rejected.map(r => r.sha)
                        const rejectedReasons = response.rejected.map(r => `${r.sha}: ${r.reason}`).join(', ')
                        markCommitsFailed(rejectedShas, rejectedReasons, this.context)
                    }

                    const lastSha = confirmedShas[confirmedShas.length - 1]
                    updateRepoSyncSha(repoId, lastSha, this.context)

                    this.output.appendLine(`[Sync] ✅ Queue item ${queueId} synced successfully`)
                }

            } catch (error) {
                // Reset syncing commits
                resetSyncingCommits(batchId, this.context)
                
                // Update attempt count with exponential backoff
                updateSyncQueueAttempt(queueId, String(error), this.context)
                this.output.appendLine(`[Sync] ❌ Queue item ${queueId} failed (attempt ${attemptCount + 1}): ${error}`)
            } finally {
                // Release lock
                releaseSyncLock(repoId, this.context)
            }
        }
    }

    async startAutoSync() {
        const config = vscode.workspace.getConfiguration('commitDiary')
        const syncEnabled = config.get<boolean>('sync.enabled', true)
        
        // Only show notification if user explicitly disabled sync
        if (!syncEnabled) {
            this.output.appendLine('[Sync] Auto-sync disabled in settings')
            this.stopAutoSync()
            return
        }

        // Check if user has API key configured
        const apiKey = await this.getAuthToken()

        if (!apiKey) {
            this.output.appendLine('[Sync] ⏸️  No API key found - auto-sync will start when you add one')
            this.output.appendLine('[Sync] Get your API key from the dashboard')
            this.stopAutoSync()
            return
        }

        const interval = config.get<string>('sync.autoInterval', 'daily')

        if (interval === 'never') {
            this.output.appendLine('[Sync] Auto-sync interval set to "never"')
            this.stopAutoSync()
            return
        }

        // Clear existing timer
        this.stopAutoSync()

        let intervalMs: number
        switch (interval) {
            case 'hourly':
                intervalMs = 60 * 60 * 1000
                break
            case 'daily':
                intervalMs = 24 * 60 * 60 * 1000
                break
            default:
                return
        }

        this.output.appendLine(`[Sync] ✅ Auto-sync enabled: every ${interval}`)

        // Run initial sync immediately
        this.output.appendLine('[Sync] Running initial sync...')
        await this.processSyncQueue()

        // Then schedule periodic syncs
        this.syncTimer = setInterval(async () => {
            this.output.appendLine('[Sync] Running scheduled sync...')
            await this.processSyncQueue()
            
            // Check for accumulated unsynced commits
            await this.checkSyncHealth()
        }, intervalMs)
    }
    
    /**
     * Check sync health and warn about accumulated unsynced commits
     */
    private async checkSyncHealth() {
        try {
            // Get all repos and check their sync status
            // This is a simple check - could be enhanced to track per-repo
            const db = (this.context.globalState as any).db
            if (!db) return
            
            const result = db.exec(`
                SELECT COUNT(*) as count 
                FROM commits 
                WHERE sync_status = 'pending'
            `)
            
            if (result && result[0] && result[0].values && result[0].values[0]) {
                const unsyncedCount = result[0].values[0][0] as number
                
                // Notify if threshold exceeded (default 50)
                await this.notificationManager?.notifyUnsyncedAccumulation(unsyncedCount, 50)
            }
        } catch (error) {
            this.output.appendLine(`[Sync Health] Error checking sync health: ${error}`)
        }
    }

    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer)
            this.syncTimer = null
            this.output.appendLine('[Sync] Auto-sync stopped')
        }
    }

    private async getAuthToken(): Promise<string | null> {
        // Check settings first (new location)
        const config = vscode.workspace.getConfiguration('commitDiary')
        const settingsApiKey = config.get<string>('apiKey', '').trim()

        if (settingsApiKey) {
            return settingsApiKey
        }

        // Fallback to secrets (legacy storage)
        const secretApiKey = await this.context.secrets.get('api_key')
        if (secretApiKey) {
            return secretApiKey
        }

        return null
    }

    private generateClientId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    private async sendTelemetry(event: string, data: any): Promise<void> {
        const telemetryEnabled = vscode.workspace.getConfiguration('commitDiary').get<boolean>('telemetry.enabled', false)

        if (!telemetryEnabled) {
            return
        }

        try {
            const token = await this.getAuthToken()
            if (!token) return

            await fetch(`${this.config.apiUrl}/v1/telemetry`, {
                method: 'POST',
                headers: {
                    'X-API-Key': token, // Use X-API-Key for all API requests
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event,
                    data,
                    timestamp: new Date().toISOString()
                })
            })
        } catch (e) {
            // Silent fail for telemetry
        }
    }

    reloadConfig() {
        this.config = this.loadConfig()
        this.output.appendLine('[Sync] Configuration reloaded')
    }
}
