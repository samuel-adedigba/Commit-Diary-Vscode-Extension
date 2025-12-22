import * as vscode from 'vscode'

export enum NotificationLevel {
    Info = 'info',
    Warning = 'warning',
    Error = 'error',
    Success = 'success'
}

export enum NotificationEvent {
    NewCommits = 'onNewCommits',
    BranchSwitch = 'onBranchSwitch',
    WorkspaceChange = 'onWorkspaceChange',
    SyncStart = 'onSyncStart',
    SyncComplete = 'onSyncComplete',
    SyncFailed = 'onSyncFailed',
    RepoDiscovered = 'onRepoDiscovered',
    FirstCommit = 'onFirstCommit'
}

export enum SyncStatus {
    Idle = 'idle',
    Syncing = 'syncing',
    Synced = 'synced',
    Pending = 'pending',
    Failed = 'failed',
    Offline = 'offline'
}

interface NotificationOptions {
    actions?: string[]
    timeout?: number // Auto-dismiss after ms (0 = no auto-dismiss)
    showInOutput?: boolean
}

interface NotificationBatch {
    event: NotificationEvent
    data: any
    timestamp: number
}

/**
 * Centralized notification manager for CommitDiary
 * Handles toast notifications, status bar updates, and user preferences
 */
export class NotificationManager {
    private output: vscode.OutputChannel
    private statusBarItem: vscode.StatusBarItem
    private syncStatus: SyncStatus = SyncStatus.Idle
    private commitCount: number = 0
    private currentRepoName: string = ''
    private batchQueue: Map<NotificationEvent, NotificationBatch[]> = new Map()
    private batchTimer: NodeJS.Timeout | null = null
    private readonly BATCH_WINDOW_MS = 30000 // 30 seconds

    constructor(output: vscode.OutputChannel, statusBarItem: vscode.StatusBarItem) {
        this.output = output
        this.statusBarItem = statusBarItem
        this.setupStatusBar()
    }

    private setupStatusBar() {
        this.statusBarItem.command = 'commitDiary.showMyCommits'
        this.updateStatusBar()
    }

    /**
     * Update status bar with current state
     */
    updateStatusBar(commitCount?: number, repoName?: string) {
        if (commitCount !== undefined) {
            this.commitCount = commitCount
        }
        if (repoName !== undefined) {
            this.currentRepoName = repoName
        }

        const icon = this.getSyncStatusIcon()
        const statusText = this.getSyncStatusText()
        
        this.statusBarItem.text = `$(git-commit) ${icon} ${this.commitCount} commits`
        this.statusBarItem.tooltip = this.buildTooltip(statusText)
        this.statusBarItem.show()
    }

    /**
     * Set sync status and update UI
     */
    setSyncStatus(status: SyncStatus, details?: string) {
        this.syncStatus = status
        this.output.appendLine(`[Status] Sync status changed to: ${status}${details ? ` - ${details}` : ''}`)
        this.updateStatusBar()
    }

    private getSyncStatusIcon(): string {
        switch (this.syncStatus) {
            case SyncStatus.Syncing:
                return '⏳'
            case SyncStatus.Synced:
                return '✅'
            case SyncStatus.Pending:
                return '⚠️'
            case SyncStatus.Failed:
                return '❌'
            case SyncStatus.Offline:
                return '📡'
            default:
                return '😀'
        }
    }

    private getSyncStatusText(): string {
        switch (this.syncStatus) {
            case SyncStatus.Syncing:
                return 'Syncing to cloud...'
            case SyncStatus.Synced:
                return 'All commits synced'
            case SyncStatus.Pending:
                return 'Unsynced commits (will sync soon)'
            case SyncStatus.Failed:
                return 'Sync failed (will retry)'
            case SyncStatus.Offline:
                return 'Offline (queued for sync)'
            default:
                return 'Ready'
        }
    }

    private buildTooltip(statusText: string): string {
        const parts = [
            `CommitDiary: ${this.commitCount} commits`,
            statusText
        ]

        if (this.currentRepoName) {
            parts.push(`Repository: ${this.currentRepoName}`)
        }

        parts.push('\nClick to view your commits')
        
        return parts.join('\n')
    }

    /**
     * Check if notification is enabled for this event type
     */
    private isEventEnabled(event: NotificationEvent): boolean {
        const config = vscode.workspace.getConfiguration('commitDiary.notifications')
        const globalEnabled = config.get<boolean>('enabled', true)
        
        if (!globalEnabled) {
            return false
        }

        // Check specific event toggle
        return config.get<boolean>(event, true)
    }

    /**
     * Get notification verbosity level
     */
    private getVerbosity(): 'quiet' | 'normal' | 'verbose' {
        const config = vscode.workspace.getConfiguration('commitDiary.notifications')
        return config.get<'quiet' | 'normal' | 'verbose'>('verbosity', 'normal')
    }

    /**
     * Add event to batch queue for smart batching
     */
    private addToBatch(event: NotificationEvent, data: any) {
        if (!this.batchQueue.has(event)) {
            this.batchQueue.set(event, [])
        }

        this.batchQueue.get(event)!.push({
            event,
            data,
            timestamp: Date.now()
        })

        // Start batch timer if not already running
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.processBatchQueue()
            }, this.BATCH_WINDOW_MS)
        }
    }

    /**
     * Process batched notifications
     */
    private processBatchQueue() {
        const verbosity = this.getVerbosity()

        for (const [event, batches] of this.batchQueue.entries()) {
            if (batches.length === 0) continue

            // For verbose mode, show all notifications
            if (verbosity === 'verbose') {
                batches.forEach(batch => {
                    this.showImmediateNotification(event, batch.data)
                })
            } 
            // For normal mode, batch similar events
            else if (verbosity === 'normal') {
                if (batches.length === 1) {
                    this.showImmediateNotification(event, batches[0].data)
                } else {
                    this.showBatchedNotification(event, batches)
                }
            }
            // For quiet mode, only show critical events
            else if (verbosity === 'quiet') {
                if (event === NotificationEvent.SyncFailed || event === NotificationEvent.FirstCommit) {
                    this.showImmediateNotification(event, batches[batches.length - 1].data)
                }
            }
        }

        // Clear queue and timer
        this.batchQueue.clear()
        this.batchTimer = null
    }

    /**
     * Show immediate notification (first event or high priority)
     */
    private showImmediateNotification(event: NotificationEvent, data: any) {
        // Implementation in specific notify methods below
        switch (event) {
            case NotificationEvent.NewCommits:
                this.showToast(NotificationLevel.Info, `${data.count} new commit${data.count > 1 ? 's' : ''} detected`, {
                    actions: ['View Commits', 'Sync Now']
                })
                break
            case NotificationEvent.BranchSwitch:
                this.showToast(NotificationLevel.Info, `Switched to branch: ${data.branch}`, {
                    actions: ['View Commits', 'Rescan']
                })
                break
            case NotificationEvent.SyncComplete:
                this.showToast(NotificationLevel.Success, `✅ Synced ${data.count} commits to cloud`, {
                    timeout: 5000
                })
                break
            case NotificationEvent.SyncFailed:
                this.showToast(NotificationLevel.Error, `Sync failed: ${data.error}`, {
                    actions: ['Retry', 'View Output']
                })
                break
        }
    }

    /**
     * Show batched notification (multiple similar events)
     */
    private showBatchedNotification(event: NotificationEvent, batches: NotificationBatch[]) {
        switch (event) {
            case NotificationEvent.NewCommits:
                const totalCommits = batches.reduce((sum, b) => sum + (b.data.count || 0), 0)
                this.showToast(NotificationLevel.Info, `${totalCommits} new commits detected (${batches.length} updates)`, {
                    actions: ['View Commits', 'Sync Now']
                })
                break
            case NotificationEvent.BranchSwitch:
                const lastBranch = batches[batches.length - 1].data.branch
                this.showToast(NotificationLevel.Info, `Switched branches ${batches.length} times (now on: ${lastBranch})`, {
                    actions: ['View Commits']
                })
                break
        }
    }

    /**
     * Show toast notification based on level
     */
    private async showToast(
        level: NotificationLevel, 
        message: string, 
        options: NotificationOptions = {}
    ): Promise<string | undefined> {
        const fullMessage = `CommitDiary: ${message}`
        
        if (options.showInOutput !== false) {
            this.output.appendLine(`[Notification] ${message}`)
        }

        const actions = options.actions || []
        
        let result: string | undefined

        switch (level) {
            case NotificationLevel.Info:
            case NotificationLevel.Success:
                result = await vscode.window.showInformationMessage(fullMessage, ...actions)
                break
            case NotificationLevel.Warning:
                result = await vscode.window.showWarningMessage(fullMessage, ...actions)
                break
            case NotificationLevel.Error:
                result = await vscode.window.showErrorMessage(fullMessage, ...actions)
                break
        }

        return result
    }

    /**
     * Notify about new commits detected
     */
    async notifyNewCommits(count: number, autoSync: boolean = true): Promise<void> {
        if (!this.isEventEnabled(NotificationEvent.NewCommits)) {
            return
        }

        const verbosity = this.getVerbosity()

        // For first detection, show immediately
        if (!this.batchQueue.has(NotificationEvent.NewCommits) || 
            this.batchQueue.get(NotificationEvent.NewCommits)!.length === 0) {
            
            const message = `${count} new commit${count > 1 ? 's' : ''} detected`
            const actions = autoSync ? ['View Commits', 'Sync Now'] : ['View Commits']
            
            const action = await this.showToast(NotificationLevel.Info, message, { actions })
            
            if (action === 'View Commits') {
                vscode.commands.executeCommand('commitDiary.showMyCommits')
            } else if (action === 'Sync Now') {
                vscode.commands.executeCommand('commitDiary.syncNow')
            }

            // Add to batch for subsequent detections
            this.addToBatch(NotificationEvent.NewCommits, { count })
        } else {
            // Add to batch queue
            this.addToBatch(NotificationEvent.NewCommits, { count })
        }
    }

    /**
     * Notify about branch switch
     */
    async notifyBranchSwitch(oldBranch: string, newBranch: string, autoDiff: boolean = true): Promise<void> {
        if (!this.isEventEnabled(NotificationEvent.BranchSwitch)) {
            return
        }

        const message = `Switched to branch: ${newBranch}`
        const actions = autoDiff ? ['View Commits', 'Rescan'] : ['View Commits']
        
        const action = await this.showToast(NotificationLevel.Info, message, { actions })
        
        if (action === 'View Commits') {
            vscode.commands.executeCommand('commitDiary.showMyCommits')
        } else if (action === 'Rescan') {
            vscode.commands.executeCommand('commitDiary.refreshCount')
        }

        this.addToBatch(NotificationEvent.BranchSwitch, { branch: newBranch })
    }

    /**
     * Notify about workspace change
     */
    async notifyWorkspaceChange(foldersAdded: number, foldersRemoved: number): Promise<void> {
        if (!this.isEventEnabled(NotificationEvent.WorkspaceChange)) {
            return
        }

        let message = ''
        if (foldersAdded > 0 && foldersRemoved > 0) {
            message = `Workspace changed: ${foldersAdded} added, ${foldersRemoved} removed`
        } else if (foldersAdded > 0) {
            message = `${foldersAdded} workspace folder${foldersAdded > 1 ? 's' : ''} added`
        } else if (foldersRemoved > 0) {
            message = `${foldersRemoved} workspace folder${foldersRemoved > 1 ? 's' : ''} removed`
        }

        if (message) {
            const action = await this.showToast(NotificationLevel.Info, message, {
                actions: ['Discover Repos', 'View Commits']
            })

            if (action === 'Discover Repos') {
                vscode.commands.executeCommand('commitDiary.discoverRepos')
            } else if (action === 'View Commits') {
                vscode.commands.executeCommand('commitDiary.showMyCommits')
            }
        }
    }

    /**
     * Notify about repository discovered
     */
    async notifyRepoDiscovered(repoName: string, commitCount: number): Promise<void> {
        if (!this.isEventEnabled(NotificationEvent.RepoDiscovered)) {
            return
        }

        const message = `Repository discovered: ${repoName} (${commitCount} commits)`
        const action = await this.showToast(NotificationLevel.Success, message, {
            actions: ['View Commits', 'Sync Now']
        })

        if (action === 'View Commits') {
            vscode.commands.executeCommand('commitDiary.showMyCommits')
        } else if (action === 'Sync Now') {
            vscode.commands.executeCommand('commitDiary.syncNow')
        }
    }

    /**
     * Notify about first commit in new repo (onboarding)
     */
    async notifyFirstCommit(repoName: string): Promise<void> {
        if (!this.isEventEnabled(NotificationEvent.FirstCommit)) {
            return
        }

        const message = `🎉 Welcome to CommitDiary! Tracking ${repoName}`
        const action = await this.showToast(NotificationLevel.Success, message, {
            actions: ['Setup Cloud Sync', 'View Commits', 'Dismiss']
        })

        if (action === 'Setup Cloud Sync') {
            vscode.commands.executeCommand('commitDiary.login')
        } else if (action === 'View Commits') {
            vscode.commands.executeCommand('commitDiary.showMyCommits')
        }
    }

    /**
     * Notify about sync start
     */
    async notifySyncStart(commitCount: number): Promise<void> {
        if (!this.isEventEnabled(NotificationEvent.SyncStart)) {
            return
        }

        this.setSyncStatus(SyncStatus.Syncing, `${commitCount} commits`)
        
        const verbosity = this.getVerbosity()
        if (verbosity === 'verbose') {
            this.showToast(NotificationLevel.Info, `Starting sync: ${commitCount} commits...`, {
                timeout: 3000
            })
        }
    }

    /**
     * Notify about sync completion
     */
    async notifySyncComplete(syncedCount: number, rejectedCount: number = 0): Promise<void> {
        if (!this.isEventEnabled(NotificationEvent.SyncComplete)) {
            return
        }

        this.setSyncStatus(SyncStatus.Synced)

        const verbosity = this.getVerbosity()
        if (verbosity !== 'quiet') {
            let message = `✅ Synced ${syncedCount} commit${syncedCount !== 1 ? 's' : ''} to cloud`
            if (rejectedCount > 0) {
                message += ` (${rejectedCount} skipped)`
            }

            this.showToast(NotificationLevel.Success, message, {
                timeout: 5000
            })
        }
    }

    /**
     * Notify about sync failure
     */
    async notifySyncFailed(error: string, willRetry: boolean = true, retryDelay?: number): Promise<void> {
        if (!this.isEventEnabled(NotificationEvent.SyncFailed)) {
            return
        }

        this.setSyncStatus(SyncStatus.Failed, error)

        let message = `Sync failed: ${error}`
        if (willRetry && retryDelay) {
            const delaySec = Math.round(retryDelay / 1000)
            message += ` (retrying in ${delaySec}s)`
        }

        const action = await this.showToast(NotificationLevel.Error, message, {
            actions: willRetry ? ['Retry Now', 'View Output', 'Dismiss'] : ['View Output', 'Dismiss']
        })

        if (action === 'Retry Now') {
            vscode.commands.executeCommand('commitDiary.syncNow')
        } else if (action === 'View Output') {
            this.output.show()
        }
    }

    /**
     * Notify about offline status (queued for sync)
     */
    async notifyOfflineQueued(commitCount: number): Promise<void> {
        const verbosity = this.getVerbosity()
        
        this.setSyncStatus(SyncStatus.Offline, `${commitCount} commits queued`)

        if (verbosity === 'verbose') {
            this.showToast(NotificationLevel.Warning, `Offline: ${commitCount} commits queued for sync`, {
                timeout: 5000
            })
        }
    }

    /**
     * Notify about accumulated unsynced commits (health monitoring)
     */
    async notifyUnsyncedAccumulation(count: number, threshold: number = 50): Promise<void> {
        if (count < threshold) {
            return
        }

        const verbosity = this.getVerbosity()
        if (verbosity === 'quiet') {
            return
        }

        this.setSyncStatus(SyncStatus.Pending, `${count} unsynced`)

        const message = `⚠️ ${count} unsynced commits. Consider syncing to cloud.`
        const action = await this.showToast(NotificationLevel.Warning, message, {
            actions: ['Sync Now', 'Dismiss']
        })

        if (action === 'Sync Now') {
            vscode.commands.executeCommand('commitDiary.syncNow')
        }
    }

    /**
     * Show progress notification with cancellation support
     */
    async showProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>,
        cancellable: boolean = false
    ): Promise<T> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `CommitDiary: ${title}`,
                cancellable
            },
            task
        )
    }

    /**
     * Dispose resources
     */
    dispose() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer)
        }
        this.processBatchQueue() // Process any pending notifications
    }
}
