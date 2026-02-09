import initSqlJs, { Database, SqlJsStatic, QueryExecResult } from 'sql.js'
import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'

let SQL: SqlJsStatic | null = null
let db: Database | null = null

const CURRENT_SCHEMA_VERSION = 3  // Updated for sync state tracking

export async function initDB(context: vscode.ExtensionContext) {
    const wasmPath = vscode.Uri.joinPath(context.extensionUri, "wasm/sql-wasm.wasm")

    SQL = await initSqlJs({
        locateFile: () => wasmPath.fsPath
    })

    const dbPath = path.join(context.globalStorageUri.fsPath, "commitdiary.sqlite")

    // Ensure dir exists
    fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true })

    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath)
        db = new SQL.Database(fileBuffer)

        // Run migrations if needed
        await runMigrations(context)
    } else {
        db = new SQL.Database()
        await createInitialSchema(context)
    }

    return db!
}

async function createInitialSchema(context: vscode.ExtensionContext) {
    if (!db) return

    // Schema version tracking
    db.run(`
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );
    `)

    // Repositories table
    db.run(`
        CREATE TABLE IF NOT EXISTS repos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT UNIQUE NOT NULL,
            remote TEXT,
            last_scanned_sha TEXT,
            last_synced_sha TEXT,
            last_synced_at TEXT,
            sync_lock TEXT,
            needs_reindex INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `)

    // Commits table (enhanced with sync tracking)
    db.run(`
        CREATE TABLE IF NOT EXISTS commits (
            sha TEXT PRIMARY KEY,
            repo_id INTEGER NOT NULL,
            author_name TEXT,
            author_email TEXT,
            author_email_hash TEXT,
            date TEXT NOT NULL,
            message TEXT,
            category TEXT,
            files_json TEXT,
            components_json TEXT,
            diff_summary TEXT,
            context_tags_json TEXT,
            synced_at TEXT,
            sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'failed')),
            sync_batch_id TEXT,
            sync_error TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
        );
    `)

    // Normalized commit files table for efficient queries
    db.run(`
        CREATE TABLE IF NOT EXISTS commit_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sha TEXT NOT NULL,
            path TEXT NOT NULL,
            component TEXT,
            FOREIGN KEY (sha) REFERENCES commits(sha) ON DELETE CASCADE
        );
    `)

    // Index for fast component queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_commit_files_component ON commit_files(component);`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_commit_files_sha ON commit_files(sha);`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_commits_repo_date ON commits(repo_id, date);`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_commits_category ON commits(category);`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_commits_sync_status ON commits(sync_status);`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_commits_sync_batch ON commits(sync_batch_id);`)

    // Sync queue for failed syncs with retry tracking
    db.run(`
        CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_id INTEGER NOT NULL,
            commits_json TEXT NOT NULL,
            payload_size_bytes INTEGER,
            attempt_count INTEGER DEFAULT 0,
            last_error TEXT,
            next_retry_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_attempt_at TEXT,
            FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
        );
    `)

    // Metrics cache for fast dashboard queries
    db.run(`
        CREATE TABLE IF NOT EXISTS metrics_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_id INTEGER NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            period_type TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
            UNIQUE(repo_id, period_start, period_type)
        );
    `)

    // Set schema version
    db.run('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
        [CURRENT_SCHEMA_VERSION, new Date().toISOString()])

    saveDB(context)
}

async function runMigrations(context: vscode.ExtensionContext) {
    if (!db) return

    // Get current schema version
    let currentVersion = 0
    try {
        const result = db.exec('SELECT MAX(version) as version FROM schema_version')
        if (result.length && result[0].values.length) {
            currentVersion = result[0].values[0][0] as number || 0
        }
    } catch (e) {
        // Schema version table doesn't exist, this is version 0
        currentVersion = 0
    }

    // Migration from v0 (old schema) to v2
    if (currentVersion === 0) {
        // Drop old table if exists and recreate with new schema
        try {
            // Check if old commits table exists
            const tableExists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='commits'")
            if (tableExists.length > 0) {
                // Backup old data
                const oldData = db.exec('SELECT * FROM commits')

                // Drop old table
                db.run('DROP TABLE IF EXISTS commits')

                // Create new schema
                await createInitialSchema(context)

                // No need to migrate old data as structure is completely different
                // User will need to rescan
            } else {
                // Fresh install
                await createInitialSchema(context)
            }
        } catch (e) {
            // Create fresh schema on error
            await createInitialSchema(context)
        }
    }

    // Migration from v2 to v3: Add sync state tracking columns
    if (currentVersion === 2) {
        try {
            // Add new columns to commits table
            db.run(`ALTER TABLE commits ADD COLUMN sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'failed'))`)
            db.run(`ALTER TABLE commits ADD COLUMN sync_batch_id TEXT`)
            db.run(`ALTER TABLE commits ADD COLUMN sync_error TEXT`)
            
            // Add new columns to repos table
            db.run(`ALTER TABLE repos ADD COLUMN sync_lock TEXT`)
            
            // Add new columns to sync_queue table
            db.run(`ALTER TABLE sync_queue ADD COLUMN payload_size_bytes INTEGER`)
            db.run(`ALTER TABLE sync_queue ADD COLUMN next_retry_at TEXT`)
            
            // Create indexes for new columns
            db.run(`CREATE INDEX IF NOT EXISTS idx_commits_sync_status ON commits(sync_status)`)
            db.run(`CREATE INDEX IF NOT EXISTS idx_commits_sync_batch ON commits(sync_batch_id)`)
            
            // Migrate existing data: Set sync_status based on synced_at
            db.run(`UPDATE commits SET sync_status = CASE WHEN synced_at IS NOT NULL THEN 'synced' ELSE 'pending' END`)
            
            // Update schema version
            db.run('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
                [3, new Date().toISOString()])
        } catch (e) {
            throw e
        }
    }

    saveDB(context)
}

export function getDB() {
    if (!db) throw new Error("Database not initialized yet")
    return db
}

export function saveDB(context: vscode.ExtensionContext) {
    if (!db) return
    const dbPath = path.join(context.globalStorageUri.fsPath, "commitdiary.sqlite")
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
}

export interface CommitInsertData {
    sha: string
    repoId: number
    authorName: string
    authorEmail: string
    date: string
    message: string
    category: string
    files: string[]
    components: string[]
    diffSummary?: string
    contextTags?: string[]
}

export function insertCommit(data: CommitInsertData, context: vscode.ExtensionContext) {
    const db = getDB()

    // Hash email for privacy (SHA-256)
    const crypto = require('crypto')
    const emailHash = crypto.createHash('sha256').update(data.authorEmail.toLowerCase()).digest('hex')

    // Check if user wants to include emails
    const config = vscode.workspace.getConfiguration('commitDiary')
    const includeEmails = config.get<boolean>('sync.includeEmails', false)

    db.run(
        `INSERT OR IGNORE INTO commits 
         (sha, repo_id, author_name, author_email, author_email_hash, date, message, category, 
          files_json, components_json, diff_summary, context_tags_json, sync_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
            data.sha,
            data.repoId,
            data.authorName,
            includeEmails ? data.authorEmail : null,
            emailHash,
            data.date,
            data.message,
            data.category,
            JSON.stringify(data.files),
            JSON.stringify(data.components),
            data.diffSummary || null,
            JSON.stringify(data.contextTags || [])
        ]
    )

    saveDB(context)
}

export function insertCommitFiles(sha: string, files: Array<{ path: string, component?: string }>, context: vscode.ExtensionContext) {
    const db = getDB()

    for (const file of files) {
        db.run(
            `INSERT INTO commit_files (sha, path, component) VALUES (?, ?, ?)`,
            [sha, file.path, file.component || null]
        )
    }

    saveDB(context)
}

export function getCommits(repoId?: number, limit = 50) {
    const db = getDB()
    const query = repoId
        ? `SELECT * FROM commits WHERE repo_id = ${repoId} ORDER BY date DESC LIMIT ${limit}`
        : `SELECT * FROM commits ORDER BY date DESC LIMIT ${limit}`
    const res = db.exec(query)
    return res.length ? res[0].values : []
}

export function getOrCreateRepo(repoPath: string, repoName: string, remote: string | null, context: vscode.ExtensionContext): number {
    const db = getDB()

    // Try to get existing repo
    const existing = db.exec(`SELECT id FROM repos WHERE path = ?`, [repoPath])
    if (existing.length && existing[0].values.length) {
        return existing[0].values[0][0] as number
    }

    // Create new repo
    db.run(
        `INSERT INTO repos (name, path, remote) VALUES (?, ?, ?)`,
        [repoName, repoPath, remote]
    )

    saveDB(context)

    // Get the inserted ID
    const result = db.exec(`SELECT id FROM repos WHERE path = ?`, [repoPath])
    return result[0].values[0][0] as number
}

export function updateRepoScanSha(repoId: number, sha: string, context: vscode.ExtensionContext) {
    const db = getDB()
    db.run(`UPDATE repos SET last_scanned_sha = ? WHERE id = ?`, [sha, repoId])
    saveDB(context)
}

export function updateRepoSyncSha(repoId: number, sha: string, context: vscode.ExtensionContext) {
    const db = getDB()
    db.run(
        `UPDATE repos SET last_synced_sha = ?, last_synced_at = ? WHERE id = ?`,
        [sha, new Date().toISOString(), repoId]
    )
    saveDB(context)
}

export function getRepoById(repoId: number) {
    const db = getDB()
    const res = db.exec(`SELECT * FROM repos WHERE id = ?`, [repoId])
    if (res.length && res[0].values.length) {
        const row = res[0].values[0]
        const columns = res[0].columns
        return Object.fromEntries(columns.map((col: string, i: number) => [col, row[i]]))
    }
    return null
}

export function getRepoByPath(repoPath: string) {
    const db = getDB()
    const res = db.exec(`SELECT * FROM repos WHERE path = ?`, [repoPath])
    if (res.length && res[0].values.length) {
        const row = res[0].values[0]
        const columns = res[0].columns
        return Object.fromEntries(columns.map((col: string, i: number) => [col, row[i]]))
    }
    return null
}

export function getUnsyncedCommits(repoId: number, limit = 500) {
    const db = getDB()
    const repo = getRepoById(repoId)

    if (!repo) return []

    // Query commits with pending or failed sync status
    const query = `
        SELECT * FROM commits 
        WHERE repo_id = ${repoId} 
        AND sync_status IN ('pending', 'failed')
        ORDER BY date ASC 
        LIMIT ${limit}
    `

    const res = db.exec(query)
    return res.length ? res[0].values : []
}

export function markCommitsSynced(shas: string[], context: vscode.ExtensionContext) {
    const db = getDB()
    const now = new Date().toISOString()

    for (const sha of shas) {
        db.run(
            `UPDATE commits SET synced_at = ?, sync_status = 'synced', sync_error = NULL WHERE sha = ?`, 
            [now, sha]
        )
    }

    saveDB(context)
}

export function addToSyncQueue(repoId: number, commitsJson: string, context: vscode.ExtensionContext) {
    const db = getDB()
    const payloadSize = Buffer.byteLength(commitsJson, 'utf-8')
    const nextRetry = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
    
    // Reject payloads > 1MB
    if (payloadSize > 1024 * 1024) {
        return
    }
    
    db.run(
        `INSERT INTO sync_queue (repo_id, commits_json, payload_size_bytes, attempt_count, last_attempt_at, next_retry_at) 
         VALUES (?, ?, ?, 0, ?, ?)`,
        [repoId, commitsJson, payloadSize, new Date().toISOString(), nextRetry]
    )
    saveDB(context)
}

export function updateSyncQueueAttempt(queueId: number, error: string, context: vscode.ExtensionContext) {
    const db = getDB()
    
    // Get current attempt count to calculate exponential backoff
    const current = db.exec(`SELECT attempt_count FROM sync_queue WHERE id = ${queueId}`)
    const attemptCount = current.length ? (current[0].values[0][0] as number) : 0
    
    // Exponential backoff: 1h, 2h, 4h, 8h
    const delayHours = Math.pow(2, attemptCount)
    const nextRetry = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString()
    
    db.run(
        `UPDATE sync_queue 
         SET attempt_count = attempt_count + 1, last_error = ?, last_attempt_at = ?, next_retry_at = ? 
         WHERE id = ?`,
        [error, new Date().toISOString(), nextRetry, queueId]
    )
    saveDB(context)
}

export function removeSyncQueueItem(queueId: number, context: vscode.ExtensionContext) {
    const db = getDB()
    db.run(`DELETE FROM sync_queue WHERE id = ?`, [queueId])
    saveDB(context)
}

export function getPendingSyncQueue() {
    const db = getDB()
    const now = new Date().toISOString()
    
    // Get queue items that are ready to retry (next_retry_at <= now) and haven't exceeded max attempts
    const res = db.exec(`
        SELECT * FROM sync_queue 
        WHERE attempt_count < 3 
        AND (next_retry_at IS NULL OR next_retry_at <= '${now}')
        ORDER BY created_at ASC
    `)
    return res.length ? res[0].values : []
}

export function getMetricsByCategory(repoId: number, startDate: string, endDate: string) {
    const db = getDB()
    const res = db.exec(`
        SELECT category, COUNT(*) as count 
        FROM commits 
        WHERE repo_id = ? AND date BETWEEN ? AND ?
        GROUP BY category 
        ORDER BY count DESC
    `, [repoId, startDate, endDate])
    return res.length ? res[0].values : []
}

export function getTopComponents(repoId: number, startDate: string, endDate: string, limit = 20) {
    const db = getDB()
    const res = db.exec(`
        SELECT cf.component, COUNT(*) as count
        FROM commit_files cf
        JOIN commits c ON cf.sha = c.sha
        WHERE c.repo_id = ? AND c.date BETWEEN ? AND ? AND cf.component IS NOT NULL
        GROUP BY cf.component
        ORDER BY count DESC
        LIMIT ${limit}
    `, [repoId, startDate, endDate])
    return res.length ? res[0].values : []
}

export function compactDatabase(context: vscode.ExtensionContext) {
    // For sql.js, we need to export and reimport to compact
    if (!db) return

    const data = db.export()
    db.close()

    if (!SQL) throw new Error("SQL.js not initialized")

    db = new SQL.Database(data)
    saveDB(context)
}

export function exportDatabaseFile(context: vscode.ExtensionContext): string {
    const dbPath = path.join(context.globalStorageUri.fsPath, "commitdiary.sqlite")
    return dbPath
}

// ============================================================================
// Enhanced Sync State Management Functions
// ============================================================================

/**
 * Get unsynced commits with cursor-based pagination
 * @param repoId Repository ID
 * @param limit Maximum commits to return
 * @param lastProcessedSha SHA of last processed commit (for cursor pagination)
 */
export function getUnsyncedCommitsCursor(repoId: number, limit = 500, lastProcessedSha: string | null = null) {
    const db = getDB()
    
    let query = `
        SELECT * FROM commits 
        WHERE repo_id = ${repoId} 
        AND sync_status IN ('pending', 'failed')
    `
    
    if (lastProcessedSha) {
        // Resume from cursor
        query += ` AND sha > '${lastProcessedSha}'`
    }
    
    query += ` ORDER BY sha ASC LIMIT ${limit}`
    
    const res = db.exec(query)
    return res.length ? res[0].values : []
}

/**
 * Mark commits as syncing with a batch ID
 */
export function markCommitsSyncing(shas: string[], batchId: string, context: vscode.ExtensionContext) {
    const db = getDB()
    
    for (const sha of shas) {
        db.run(
            `UPDATE commits 
             SET sync_status = 'syncing', sync_batch_id = ? 
             WHERE sha = ?`,
            [batchId, sha]
        )
    }
    
    saveDB(context)
}

/**
 * Mark specific commits as successfully synced (server confirmed)
 */
export function markCommitsSyncedWithTimestamp(shas: string[], serverTime: string, context: vscode.ExtensionContext) {
    const db = getDB()
    
    for (const sha of shas) {
        db.run(
            `UPDATE commits 
             SET sync_status = 'synced', synced_at = ?, sync_error = NULL 
             WHERE sha = ?`,
            [serverTime, sha]
        )
    }
    
    saveDB(context)
}

/**
 * Mark commits as failed with error message
 */
export function markCommitsFailed(shas: string[], error: string, context: vscode.ExtensionContext) {
    const db = getDB()
    
    for (const sha of shas) {
        db.run(
            `UPDATE commits 
             SET sync_status = 'failed', sync_error = ? 
             WHERE sha = ?`,
            [error, sha]
        )
    }
    
    saveDB(context)
}

/**
 * Reset commits from syncing to pending (on sync failure)
 */
export function resetSyncingCommits(batchId: string, context: vscode.ExtensionContext) {
    const db = getDB()
    
    db.run(
        `UPDATE commits 
         SET sync_status = 'pending', sync_batch_id = NULL 
         WHERE sync_batch_id = ? AND sync_status = 'syncing'`,
        [batchId]
    )
    
    saveDB(context)
}

/**
 * Acquire sync lock for a repo (returns true if lock acquired)
 */
export function acquireSyncLock(repoId: number, context: vscode.ExtensionContext): boolean {
    const db = getDB()
    
    // Check if lock is available (null or expired > 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const lockCheck = db.exec(
        `SELECT sync_lock FROM repos WHERE id = ${repoId}`
    )
    
    if (lockCheck.length === 0) return false
    
    const currentLock = lockCheck[0].values[0]?.[0] as string | null
    
    // Lock is available if null or expired
    if (currentLock === null || currentLock < fiveMinutesAgo) {
        const now = new Date().toISOString()
        db.run(`UPDATE repos SET sync_lock = ? WHERE id = ?`, [now, repoId])
        saveDB(context)
        return true
    }
    
    return false
}

/**
 * Release sync lock for a repo
 */
export function releaseSyncLock(repoId: number, context: vscode.ExtensionContext) {
    const db = getDB()
    db.run(`UPDATE repos SET sync_lock = NULL WHERE id = ?`, [repoId])
    saveDB(context)
}

/**
 * Get sync statistics for a repo
 */
export function getSyncStats(repoId: number) {
    const db = getDB()
    
    const stats = db.exec(`
        SELECT 
            sync_status,
            COUNT(*) as count
        FROM commits
        WHERE repo_id = ${repoId}
        GROUP BY sync_status
    `)
    
    return stats.length ? stats[0].values : []
}

/**
 * Clean up old failed commits (reset to pending after 24h)
 */
export function resetOldFailedCommits(context: vscode.ExtensionContext) {
    const db = getDB()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    db.run(
        `UPDATE commits 
         SET sync_status = 'pending', sync_error = NULL 
         WHERE sync_status = 'failed' AND synced_at < ?`,
        [oneDayAgo]
    )
    
    saveDB(context)
}
