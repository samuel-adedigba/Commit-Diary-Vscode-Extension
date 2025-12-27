"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// main entry point
const vscode = require("vscode");
const path = require("path");
const repoDiscovery_1 = require("./repoDiscovery");
const userIdentity_1 = require("./userIdentity");
const simple_git_1 = require("simple-git");
const gitLog_1 = require("./gitLog");
const categorizer_1 = require("./categorizer");
const db_1 = require("./db");
const componentDetector_1 = require("./componentDetector");
const sync_1 = require("./sync");
const auth_1 = require("./auth");
const notifications_1 = require("./notifications");
// Status bar item for real-time commit count display
let statusBarItem;
// Debounce timeout for status bar updates
let debounceTimer = null;
// Git watcher for instant updates on changes
let gitWatcher = null;
// Current repo root for watcher
let currentRepoRoot = null;
// Commit cache Map: repoPath -> CommitCache (supports multiple workspaces)
const commitCacheMap = new Map();
// Global managers
let syncManager = null;
let authManager = null;
let notificationManager = null;
// Track current branch for switch detection
let currentBranch = null;
let lastCommitCount = 0;
/**
 * Check if this is the first run and prompt user to register for cloud sync
 */
async function checkFirstRunAndPromptRegistration(context, auth, output) {
    const hasSeenWelcome = context.globalState.get('hasSeenWelcome', false);
    const hasApiKey = await auth.isAuthenticated();
    output.appendLine(`[FirstRun] hasSeenWelcome: ${hasSeenWelcome}, hasApiKey: ${hasApiKey}`);
    if (!hasSeenWelcome && !hasApiKey) {
        // First run - show registration prompt
        output.appendLine('[FirstRun] Showing registration prompt...');
        await auth.promptRegistration();
        await context.globalState.update('hasSeenWelcome', true);
    }
    else if (!hasApiKey) {
        // Not first run, but no API key - show subtle reminder after 30 seconds
        setTimeout(async () => {
            const stillNoKey = !(await auth.isAuthenticated());
            if (stillNoKey) {
                output.appendLine('[FirstRun] Showing delayed registration reminder...');
                const action = await vscode.window.showInformationMessage('💡 CommitDiary: Enable cloud sync to backup your commits', 'Get API Key', 'Dismiss');
                if (action === 'Get API Key') {
                    await auth.promptRegistration();
                }
            }
        }, 30000); // 30 seconds
    }
    // Watch for API key changes and trigger sync
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('commitDiary.apiKey')) {
            const newApiKey = vscode.workspace.getConfiguration('commitDiary').get('apiKey', '').trim();
            if (newApiKey && syncManager) {
                output.appendLine('[FirstRun] ✅ API key detected! Starting initial sync...');
                // Validate the key first
                const isValid = await auth.validateApiKey(newApiKey);
                if (isValid) {
                    // Show success notification
                    vscode.window.showInformationMessage('✅ CommitDiary: API key validated! Scanning and syncing your commits...', 'View Output').then(action => {
                        if (action === 'View Output') {
                            output.show();
                        }
                    });
                    // Trigger initial sync
                    await syncManager.startAutoSync();
                    // Trigger commit scanning which will automatically sync
                    output.appendLine('[FirstRun] Triggering automatic commit scan...');
                    setTimeout(async () => {
                        try {
                            await vscode.commands.executeCommand('commitDiary.showMyCommits');
                            output.appendLine('[FirstRun] ✅ Initial scan and sync complete!');
                        }
                        catch (error) {
                            output.appendLine(`[FirstRun] ❌ Scan failed: ${error}`);
                        }
                    }, 1000);
                }
                else {
                    vscode.window.showErrorMessage('❌ CommitDiary: Invalid API key. Please check and try again.', 'Open Settings').then(action => {
                        if (action === 'Open Settings') {
                            vscode.commands.executeCommand('workbench.action.openSettings', 'commitDiary.apiKey');
                        }
                    });
                }
            }
        }
    }));
}
async function activate(context) {
    const output = vscode.window.createOutputChannel("CommitDiary");
    output.appendLine("CommitDiary activated!");
    // Initialize database
    try {
        await (0, db_1.initDB)(context);
        output.appendLine("✅ Database initialized");
    }
    catch (error) {
        output.appendLine(`❌ Database initialization failed: ${error}`);
        vscode.window.showErrorMessage(`CommitDiary: Database initialization failed: ${error}`);
    }
    // Initialize status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(statusBarItem);
    // Initialize notification manager first
    notificationManager = new notifications_1.NotificationManager(output, statusBarItem);
    // Initialize sync and auth managers with notification manager
    syncManager = new sync_1.SyncManager(context, output, notificationManager);
    authManager = new auth_1.AuthManager(context, output);
    // Check for first-run and prompt registration
    await checkFirstRunAndPromptRegistration(context, authManager, output);
    // Auto-fetch on activation if workspace has a Git repo
    const initialRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (initialRoot) {
        output.appendLine(`[Activation] Scanning initial workspace: ${initialRoot}`);
        await scanAndSaveRepository(initialRoot);
    }
    else {
        output.appendLine('[Activation] No workspace folder found');
    }
    // Start auto-sync AFTER initial scan (so repo is in database)
    output.appendLine('[Activation] Starting auto-sync...');
    try {
        await syncManager.startAutoSync();
        output.appendLine('[Activation] Auto-sync initialization complete');
    }
    catch (error) {
        output.appendLine(`[Activation] Auto-sync error: ${error}`);
    }
    // Auto-update on workspace changes
    const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
        output.appendLine('[WorkspaceChange] Workspace folders changed, clearing cache and rescanning...');
        // Notify about workspace change
        const foldersAdded = event.added.length;
        const foldersRemoved = event.removed.length;
        await notificationManager?.notifyWorkspaceChange(foldersAdded, foldersRemoved);
        commitCacheMap.clear();
        // Clear git watcher
        if (gitWatcher) {
            gitWatcher.dispose();
            gitWatcher = null;
            currentRepoRoot = null;
        }
        // Scan new workspace
        const newRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (newRoot) {
            await scanAndSaveRepository(newRoot);
            await updateStatusBar();
        }
    });
    context.subscriptions.push(workspaceWatcher);
    // Auto-invalidate cache when configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('commitDiary.defaultTimeRange') ||
            e.affectsConfiguration('commitDiary.user.emails')) {
            output.appendLine('[Debug] Configuration changed, clearing cache...');
            commitCacheMap.clear();
            updateStatusBar();
        }
        // Reload component detector if component rules changed
        if (e.affectsConfiguration('commitDiary.componentRules')) {
            output.appendLine('[Debug] Component rules changed, reloading detector...');
            (0, componentDetector_1.reloadComponentDetector)();
        }
        // Reload sync config if sync settings changed
        if (e.affectsConfiguration('commitDiary.sync')) {
            output.appendLine('[Debug] Sync configuration changed...');
            syncManager?.reloadConfig();
            syncManager?.startAutoSync();
        }
    });
    context.subscriptions.push(configWatcher);
    // Helper function to save commits to database
    async function saveCommitsToDatabase(root, commits) {
        try {
            const git = (0, simple_git_1.default)(root);
            const remotes = await git.getRemotes(true);
            const remote = remotes.find(r => r.name === 'origin')?.refs.fetch || null;
            const repoName = root.split('/').pop() || 'unknown';
            const repoId = (0, db_1.getOrCreateRepo)(root, repoName, remote, context);
            const componentDetector = (0, componentDetector_1.getComponentDetector)();
            for (const commit of commits) {
                const analysis = (0, categorizer_1.categorizeCommit)(commit.message);
                const components = componentDetector.detectComponents(commit.files);
                const filesWithComponents = componentDetector.detectComponentsWithFiles(commit.files).map(f => ({
                    path: f.path,
                    component: f.component || undefined
                }));
                const commitData = {
                    sha: commit.sha,
                    repoId,
                    authorName: commit.authorName,
                    authorEmail: commit.authorEmail,
                    date: commit.date,
                    message: commit.message,
                    category: analysis.category,
                    files: commit.files,
                    components,
                    diffSummary: undefined,
                    contextTags: []
                };
                (0, db_1.insertCommit)(commitData, context);
                (0, db_1.insertCommitFiles)(commit.sha, filesWithComponents, context);
            }
            // Update last scanned SHA
            if (commits.length > 0) {
                const latestSha = commits[0].sha;
                (0, db_1.updateRepoScanSha)(repoId, latestSha, context);
            }
            output.appendLine(`[DB] Saved ${commits.length} commits to database (status: pending)`);
        }
        catch (error) {
            output.appendLine(`[DB] Error saving commits: ${error}`);
        }
    }
    // Function to scan and save commits for a repository
    async function scanAndSaveRepository(root) {
        try {
            output.appendLine(`[Scan] Starting repository scan: ${root}`);
            // Check if it's a git repo
            const git = (0, simple_git_1.default)(root);
            const isRepo = await git.checkIsRepo();
            if (!isRepo) {
                output.appendLine(`[Scan] Not a git repository: ${root}`);
                return;
            }
            // Get or create repo in database
            const repoName = path.basename(root);
            let remoteUrl = null;
            try {
                const remotes = await git.getRemotes(true);
                remoteUrl = remotes.find(r => r.name === 'origin')?.refs?.fetch || null;
            }
            catch (error) {
                output.appendLine(`[Scan] No remote found: ${error}`);
            }
            const repoId = (0, db_1.getOrCreateRepo)(root, repoName, remoteUrl, context);
            output.appendLine(`[Scan] Repository ID: ${repoId}`);
            // Get user identity
            let emails = await (0, userIdentity_1.getUserEmails)(root);
            let name = await (0, userIdentity_1.getUserName)(root);
            if (emails.length === 0 && name) {
                const discovered = await (0, userIdentity_1.discoverRepoEmailsForName)(root, name);
                if (discovered.length) {
                    emails = discovered;
                    output.appendLine(`[Scan] Discovered emails for ${name}: ${emails.join(', ')}`);
                }
            }
            if (emails.length === 0 && !name) {
                output.appendLine(`[Scan] No git user.email or user.name found. Set commitDiary.user.emails or run git config user.email.`);
                vscode.window.showWarningMessage('CommitDiary: Set commitDiary.user.emails or configure git user.email for this repo.');
                return;
            }
            const identityRegex = (0, userIdentity_1.buildIdentityRegex)(emails, name ? [name] : []);
            output.appendLine(`[Scan] Identity regex: ${identityRegex}`);
            // Fetch commits
            const timeRange = vscode.workspace.getConfiguration('commitDiary').get('defaultTimeRange', '1 year');
            output.appendLine(`[Scan] Fetching commits for time range: ${timeRange}`);
            let commits = await (0, gitLog_1.getCommitsByIdentity)(root, identityRegex, 500, 'author', true, timeRange);
            if (commits.length === 0) {
                commits = await (0, gitLog_1.getCommitsByIdentity)(root, identityRegex, 500, 'committer', true, timeRange);
            }
            output.appendLine(`[Scan] Found ${commits.length} commits`);
            if (commits.length > 0) {
                // Check if this is first commit detection (new repo)
                const existingRepo = (0, db_1.getRepoByPath)(root);
                const isFirstCommit = !existingRepo || !existingRepo.last_scan_sha;
                // Save to database
                await saveCommitsToDatabase(root, commits);
                // Update cache
                const headSHA = await git.revparse(['HEAD']);
                commitCacheMap.set(root, {
                    repoPath: root,
                    headSHA,
                    commits,
                    timestamp: Date.now(),
                    timeRange,
                });
                // Update repo scan SHA
                (0, db_1.updateRepoScanSha)(repoId, headSHA, context);
                // Initialize branch tracking
                currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
                lastCommitCount = commits.length;
                // Setup git watcher
                setupGitWatcher(root);
                // Update status bar with commit count
                notificationManager?.updateStatusBar(commits.length, repoName);
                output.appendLine(`[Scan] Updated status bar: ${commits.length} commits`);
                // Notify based on scenario (non-blocking - errors won't stop sync)
                try {
                    if (isFirstCommit) {
                        await notificationManager?.notifyFirstCommit(repoName);
                    }
                    else {
                        await notificationManager?.notifyRepoDiscovered(repoName, commits.length);
                    }
                    output.appendLine(`[Scan] Notification sent successfully`);
                }
                catch (notifError) {
                    output.appendLine(`[Scan] Notification error (non-fatal): ${notifError}`);
                }
                // Trigger sync if authenticated
                const hasApiKey = await authManager.isAuthenticated();
                output.appendLine(`[Scan] Has API key: ${hasApiKey}`);
                if (syncManager && hasApiKey) {
                    output.appendLine(`[Scan] Triggering cloud sync for repo ${repoId}...`);
                    try {
                        const syncResult = await syncManager.syncToCloud(repoId);
                        output.appendLine(`[Scan] Sync result: ${syncResult}`);
                    }
                    catch (error) {
                        output.appendLine(`[Scan] Sync error: ${error}`);
                    }
                }
                else {
                    if (!syncManager) {
                        output.appendLine(`[Scan] Skipping sync - sync manager not initialized`);
                    }
                    else if (!hasApiKey) {
                        output.appendLine(`[Scan] Skipping sync - no API key configured`);
                    }
                }
            }
            else {
                // No commits found - still update status bar
                notificationManager?.updateStatusBar(0, repoName);
            }
        }
        catch (error) {
            output.appendLine(`[Scan] Error scanning repository: ${error}`);
            notificationManager?.updateStatusBar(0, 'unknown');
        }
    }
    // Function to setup or update git watcher for a repo
    function setupGitWatcher(repoRoot) {
        // Dispose old watcher if any
        if (gitWatcher) {
            gitWatcher.dispose();
        }
        currentRepoRoot = repoRoot;
        // Watch .git/refs/** (branches/commits), .git/HEAD (branch switches), .git/index (staged changes)
        gitWatcher = vscode.workspace.createFileSystemWatcher(`${repoRoot}/.git/{refs/**,HEAD,index}`, false, true, false);
        gitWatcher.onDidChange(() => scheduleStatusUpdate());
        gitWatcher.onDidCreate(() => scheduleStatusUpdate());
        gitWatcher.onDidDelete(() => scheduleStatusUpdate());
        context.subscriptions.push(gitWatcher);
    }
    // Function to schedule a debounced status update
    async function scheduleStatusUpdate() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        const config = vscode.workspace.getConfiguration('commitDiary');
        const delay = config.get('debounceDelay', 2000);
        debounceTimer = setTimeout(async () => {
            await updateStatusBarWithNotifications();
        }, delay);
    }
    // Enhanced status bar update with branch/commit change detection
    async function updateStatusBarWithNotifications() {
        if (!currentRepoRoot)
            return;
        try {
            const git = (0, simple_git_1.default)(currentRepoRoot);
            const config = vscode.workspace.getConfiguration('commitDiary');
            // Detect branch switch
            const newBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
            const branchChanged = currentBranch && currentBranch !== newBranch;
            if (branchChanged) {
                output.appendLine(`[BranchSwitch] Branch changed: ${currentBranch} → ${newBranch}`);
                await notificationManager?.notifyBranchSwitch(currentBranch, newBranch);
                // Auto-rescan if enabled
                const autoDiff = config.get('commitDiary.autoDiff.onBranchSwitch', true);
                if (autoDiff) {
                    // Clear cache to force rescan
                    commitCacheMap.delete(currentRepoRoot);
                }
            }
            currentBranch = newBranch;
            // Update status bar
            await updateStatusBar();
            // Detect new commits
            const repoName = path.basename(currentRepoRoot);
            const commitCount = lastCommitCount;
            const newCommitCount = await getCommitCountForRepo(currentRepoRoot);
            if (commitCount > 0 && newCommitCount > commitCount) {
                const newCommits = newCommitCount - commitCount;
                output.appendLine(`[NewCommits] Detected ${newCommits} new commits`);
                await notificationManager?.notifyNewCommits(newCommits);
                // Auto-sync if enabled
                const autoSync = config.get('commitDiary.autoSync.onDetection', true);
                if (autoSync && authManager && await authManager.isAuthenticated()) {
                    output.appendLine(`[AutoSync] Triggering automatic sync...`);
                    const repo = (0, db_1.getRepoByPath)(currentRepoRoot);
                    if (repo) {
                        // Save new commits first
                        await scanAndSaveRepository(currentRepoRoot);
                        // Then sync
                        await syncManager?.syncToCloud(repo.id);
                    }
                }
            }
            lastCommitCount = newCommitCount;
        }
        catch (e) {
            output.appendLine(`[StatusUpdate] Error: ${e}`);
        }
    }
    // Helper to get commit count for repo
    async function getCommitCountForRepo(repoPath) {
        try {
            const cachedData = commitCacheMap.get(repoPath);
            if (cachedData) {
                return cachedData.commits.length;
            }
            const git = (0, simple_git_1.default)(repoPath);
            let emails = await (0, userIdentity_1.getUserEmails)(repoPath);
            let name = await (0, userIdentity_1.getUserName)(repoPath);
            if (emails.length === 0 && name) {
                const discovered = await (0, userIdentity_1.discoverRepoEmailsForName)(repoPath, name);
                if (discovered.length)
                    emails = discovered;
            }
            if (emails.length === 0 && !name)
                return 0;
            const identityRegex = (0, userIdentity_1.buildIdentityRegex)(emails, name ? [name] : []);
            const timeRange = vscode.workspace.getConfiguration('commitDiary').get('defaultTimeRange', '1 year');
            let commits = await (0, gitLog_1.getCommitsByIdentity)(repoPath, identityRegex, 500, 'author', false, timeRange);
            if (commits.length === 0) {
                commits = await (0, gitLog_1.getCommitsByIdentity)(repoPath, identityRegex, 500, 'committer', false, timeRange);
            }
            return commits.length;
        }
        catch (e) {
            return 0;
        }
    }
    // Function to update status bar with current commit count
    async function updateStatusBar() {
        if (!currentRepoRoot)
            return;
        try {
            const git = (0, simple_git_1.default)(currentRepoRoot);
            const config = vscode.workspace.getConfiguration('commitDiary');
            const timeRange = config.get('defaultTimeRange', '1 year');
            // Get current HEAD SHA for cache validation
            const currentHeadSHA = await git.revparse(['HEAD']);
            // Check if cache is valid
            const cachedData = commitCacheMap.get(currentRepoRoot);
            const isCacheValid = cachedData &&
                cachedData.headSHA === currentHeadSHA &&
                cachedData.timeRange === timeRange;
            let commits;
            if (isCacheValid && cachedData) {
                // Use cached data
                commits = cachedData.commits;
            }
            else {
                // Fetch fresh data
                let emails = await (0, userIdentity_1.getUserEmails)(currentRepoRoot);
                let name = await (0, userIdentity_1.getUserName)(currentRepoRoot);
                // Use simple discovery for status bar
                if (emails.length === 0 && name) {
                    const discovered = await (0, userIdentity_1.discoverRepoEmailsForName)(currentRepoRoot, name);
                    if (discovered.length)
                        emails = discovered;
                }
                if (emails.length === 0 && !name)
                    return; // No identity
                const identityRegex = (0, userIdentity_1.buildIdentityRegex)(emails, name ? [name] : []);
                commits = await (0, gitLog_1.getCommitsByIdentity)(currentRepoRoot, identityRegex, 500, 'author', false, timeRange);
                if (commits.length === 0) {
                    commits = await (0, gitLog_1.getCommitsByIdentity)(currentRepoRoot, identityRegex, 500, 'committer', false, timeRange);
                }
                // Update cache only if we have commits (don't cache empty/bad results)
                if (commits.length > 0) {
                    commitCacheMap.set(currentRepoRoot, {
                        repoPath: currentRepoRoot,
                        headSHA: currentHeadSHA,
                        commits,
                        timestamp: Date.now(),
                        timeRange
                    });
                }
            }
            statusBarItem.text = `$(git-commit) 😀 ${commits.length} commits`;
            statusBarItem.tooltip = "Click to view your commits 😀";
            statusBarItem.show();
            // Update notification manager
            const repoName = path.basename(currentRepoRoot);
            notificationManager?.updateStatusBar(commits.length, repoName);
        }
        catch (e) {
            // Ignore errors in status bar update
        }
    }
    const showMyCommits = vscode.commands.registerCommand("commitDiary.showMyCommits", async () => {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ".";
        output.appendLine(`[Debug] Workspace root: ${root}`);
        const git = (0, simple_git_1.default)(root);
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            vscode.window.showWarningMessage("CommitDiary: current workspace is not a Git repository.");
            output.appendLine("[Warn] Current workspace is not a Git repository.");
            output.show();
            return;
        }
        // Setup real-time updates for this repo
        setupGitWatcher(root);
        updateStatusBar();
        let emails = await (0, userIdentity_1.getUserEmails)(root);
        let name = await (0, userIdentity_1.getUserName)(root);
        // If no emails, try to discover from repo by matching user.name
        if (emails.length === 0 && name) {
            const discovered = await (0, userIdentity_1.discoverRepoEmailsForName)(root, name);
            if (discovered.length) {
                emails = discovered;
                output.appendLine(`[Debug] Discovered emails for ${name}: ${emails.join(', ')}`);
            }
        }
        if (emails.length === 0 && !name) {
            output.appendLine(`[Warn] No git user.email or user.name found. Set commitDiary.user.emails or run git config user.email.`);
            vscode.window.showWarningMessage("CommitDiary: set commitDiary.user.emails or configure git user.email for this repo.");
            return;
        }
        const identityRegex = (0, userIdentity_1.buildIdentityRegex)(emails, name ? [name] : []);
        output.appendLine(`[Debug] Identity regex: ${identityRegex}`);
        // Get configuration for time range
        const config = vscode.workspace.getConfiguration('commitDiary');
        const timeRange = config.get('defaultTimeRange', '1 year');
        output.appendLine(`[Debug] Using timeRange: ${timeRange}`);
        // Get current HEAD SHA for cache validation
        const currentHeadSHA = await git.revparse(['HEAD']);
        // Check if cache is valid
        const cachedData = commitCacheMap.get(root);
        const isCacheValid = cachedData &&
            cachedData.headSHA === currentHeadSHA &&
            cachedData.timeRange === timeRange;
        let commits;
        // Always fetch fresh data for manual scan command (ignore cache)
        output.appendLine(`[Debug] Fetching fresh data from repository...`);
        // Try author first
        commits = await (0, gitLog_1.getCommitsByIdentity)(root, identityRegex, 500, 'author', true, timeRange);
        // If none, try committer (some merges or rebases may reflect as committer)
        if (commits.length === 0) {
            output.appendLine(`[Debug] No author matches, trying committer…`);
            commits = await (0, gitLog_1.getCommitsByIdentity)(root, identityRegex, 500, 'committer', true, timeRange);
        }
        // Update cache and ALWAYS save to database
        if (commits.length > 0) {
            commitCacheMap.set(root, {
                repoPath: root,
                headSHA: currentHeadSHA,
                commits,
                timestamp: Date.now(),
                timeRange
            });
            // ALWAYS save to database when scan command is run
            output.appendLine(`[DB] Saving ${commits.length} commits to database...`);
            await saveCommitsToDatabase(root, commits);
            output.appendLine(`[DB] ✅ Saved successfully`);
            // Trigger sync if authenticated
            const repo = (0, db_1.getRepoByPath)(root);
            if (repo && syncManager && await authManager.isAuthenticated()) {
                output.appendLine(`[Sync] Triggering cloud sync for repo ${repo.id}...`);
                await syncManager.syncToCloud(repo.id);
            }
        }
        output.appendLine(`[Debug] Fetched ${commits.length} commit(s) for identity=${identityRegex}.`);
        for (const c of commits) {
            const analysis = (0, categorizer_1.categorizeCommit)(c.message);
            output.appendLine(`${c.date} — ${analysis.enhancedMessage}  -[${analysis.category}] ${analysis.originalMessage}`);
            for (const file of c.files) {
                output.appendLine(`  + ${file}`);
            }
        }
        output.show(true);
        if (commits.length === 0) {
            const hintSince = timeRange === 'all' ? 'entire history' : timeRange + ' ago';
            output.appendLine(`[Hint] Run: git -C "${root}" shortlog -sne --all --since '${timeRange} ago' (check which email(s)/name(s) appear in history)`);
            vscode.window.showInformationMessage(`No commits matched your identity in the ${hintSince}. Consider adding all your emails in Settings: commitDiary.user.emails, or check if your identity is configured correctly.`);
        }
    });
    context.subscriptions.push(showMyCommits);
    const refresh = vscode.commands.registerCommand('commitDiary.refreshCount', async () => {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (root && await (0, simple_git_1.default)(root).checkIsRepo()) {
            setupGitWatcher(root);
            updateStatusBar();
        }
        else {
            vscode.window.showWarningMessage("CommitDiary: No Git repository in current workspace.");
        }
    });
    context.subscriptions.push(refresh);
    const clearCache = vscode.commands.registerCommand('commitDiary.clearCache', async () => {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) {
            vscode.window.showWarningMessage("CommitDiary: No workspace open.");
            return;
        }
        const cacheSize = commitCacheMap.size;
        commitCacheMap.clear();
        output.appendLine(`[Debug] Cleared ${cacheSize} cached repo(s)`);
        output.show(true);
        await updateStatusBar();
        vscode.window.showInformationMessage("CommitDiary: Cache cleared and refreshed.");
    });
    context.subscriptions.push(clearCache);
    const showMetrics = vscode.commands.registerCommand('commitDiary.showMetrics', async () => {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ".";
        output.appendLine(`[Debug] Workspace root: ${root}`);
        const git = (0, simple_git_1.default)(root);
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            vscode.window.showWarningMessage("CommitDiary: current workspace is not a Git repository.");
            output.appendLine("[Warn] Current workspace is not a Git repository.");
            output.show();
            return;
        }
        // Prompt user for custom date range
        const timeRangeOptions = [
            { label: "1 week", value: "1 week" },
            { label: "2 weeks", value: "2 weeks" },
            { label: "1 month", value: "1 month" },
            { label: "3 months", value: "3 months" },
            { label: "6 months", value: "6 months" },
            { label: "1 year", value: "1 year" },
            { label: "2 years", value: "2 years" },
            { label: "All time", value: "all" }
        ];
        const selectedRange = await vscode.window.showQuickPick(timeRangeOptions, {
            placeHolder: "Select time range for metrics",
            title: "CommitDiary Metrics - Time Range"
        });
        if (!selectedRange)
            return; // User cancelled
        const customTimeRange = selectedRange.value;
        output.appendLine(`[Debug] User selected time range: ${customTimeRange}`);
        // Get user identity
        let emails = await (0, userIdentity_1.getUserEmails)(root);
        let name = await (0, userIdentity_1.getUserName)(root);
        if (emails.length === 0 && name) {
            const discovered = await (0, userIdentity_1.discoverRepoEmailsForName)(root, name);
            if (discovered.length) {
                emails = discovered;
                output.appendLine(`[Debug] Discovered emails for ${name}: ${emails.join(', ')}`);
            }
        }
        if (emails.length === 0 && !name) {
            output.appendLine(`[Warn] No git user.email or user.name found.`);
            vscode.window.showWarningMessage("CommitDiary: set commitDiary.user.emails or configure git user.email for this repo.");
            return;
        }
        const identityRegex = (0, userIdentity_1.buildIdentityRegex)(emails, name ? [name] : []);
        output.appendLine(`[Debug] Identity regex: ${identityRegex}`);
        output.appendLine(`[Debug] Fetching commits for time range: ${customTimeRange}`);
        // Fetch commits with custom time range (bypasses cache for manual queries)
        let commits = await (0, gitLog_1.getCommitsByIdentity)(root, identityRegex, 1000, 'author', false, customTimeRange);
        if (commits.length === 0) {
            commits = await (0, gitLog_1.getCommitsByIdentity)(root, identityRegex, 1000, 'committer', false, customTimeRange);
        }
        output.appendLine(`[Debug] Fetched ${commits.length} commit(s).`);
        if (commits.length === 0) {
            output.appendLine(`[Warn] No commits found in the selected time range.`);
            vscode.window.showInformationMessage(`No commits found in ${customTimeRange}.`);
            output.show(true);
            return;
        }
        // Calculate metrics
        const categoryStats = {};
        const dailyStats = {};
        const monthlyStats = {};
        const componentStats = {};
        for (const c of commits) {
            const analysis = (0, categorizer_1.categorizeCommit)(c.message);
            categoryStats[analysis.category] = (categoryStats[analysis.category] || 0) + 1;
            const date = new Date(c.date);
            const dayKey = date.toISOString().slice(0, 10);
            const monthKey = date.toISOString().slice(0, 7);
            dailyStats[dayKey] = (dailyStats[dayKey] || 0) + 1;
            monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;
            // Track components/files (extract from commit message)
            // Look for patterns like: "feat(component):", "fix(auth):", or file paths
            const componentMatch = c.message.match(/(?:\w+\()?([a-zA-Z0-9_-]+)(?:\)|:)/);
            if (componentMatch) {
                const component = componentMatch[1];
                // Skip common generic terms
                if (!['feat', 'fix', 'docs', 'test', 'chore', 'build', 'ci', 'perf', 'style', 'refactor'].includes(component.toLowerCase())) {
                    componentStats[component] = (componentStats[component] || 0) + 1;
                }
            }
        }
        // Calculate date ranges
        const startDate = commits[commits.length - 1]?.date.slice(0, 10);
        const endDate = commits[0]?.date.slice(0, 10);
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const calendarDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const activeDays = Object.keys(dailyStats).length;
        // Display metrics
        output.appendLine(`\n${'='.repeat(60)}`);
        output.appendLine(`📊 COMMIT METRICS - ${customTimeRange.toUpperCase()}`);
        output.appendLine(`${'='.repeat(60)}\n`);
        output.appendLine(`📈 Total Commits: ${commits.length}`);
        output.appendLine(`📅 Date Range: ${startDate} → ${endDate} (${calendarDays} calendar days)`);
        output.appendLine(`📆 Active Days: ${activeDays} days with commits`);
        output.appendLine(``);
        // Category breakdown
        output.appendLine(`🏷️  COMMITS BY CATEGORY:`);
        output.appendLine(`${'─'.repeat(60)}`);
        const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
        for (const [category, count] of sortedCategories) {
            const percentage = ((count / commits.length) * 100).toFixed(1);
            const bar = '█'.repeat(Math.floor((count / commits.length) * 40));
            output.appendLine(`  ${category.padEnd(12)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%)  ${bar}`);
        }
        output.appendLine(``);
        // Monthly breakdown (top 12 months)
        output.appendLine(`📅 COMMITS BY MONTH (Top 12):`);
        output.appendLine(`${'─'.repeat(60)}`);
        const sortedMonths = Object.entries(monthlyStats).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
        for (const [month, count] of sortedMonths) {
            const bar = '▓'.repeat(Math.floor((count / Math.max(...Object.values(monthlyStats))) * 30));
            output.appendLine(`  ${month}  ${count.toString().padStart(4)} commits  ${bar}`);
        }
        output.appendLine(``);
        // Top components
        if (Object.keys(componentStats).length > 0) {
            output.appendLine(`🔧 TOP COMPONENTS (Top 10):`);
            output.appendLine(`${'─'.repeat(60)}`);
            const sortedComponents = Object.entries(componentStats).sort((a, b) => b[1] - a[1]).slice(0, 10);
            for (const [component, count] of sortedComponents) {
                const percentage = ((count / commits.length) * 100).toFixed(1);
                output.appendLine(`  ${component.padEnd(25)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%)`);
            }
            output.appendLine(``);
        }
        // Most productive day
        const maxDayCommits = Math.max(...Object.values(dailyStats));
        const productiveDay = Object.entries(dailyStats).find(([_, count]) => count === maxDayCommits)?.[0];
        output.appendLine(`🔥 Most Productive Day: ${productiveDay} (${maxDayCommits} commits)`);
        // Average commits per day - both metrics
        const avgPerCalendarDay = (commits.length / calendarDays).toFixed(3);
        const avgPerActiveDay = (commits.length / activeDays).toFixed(2);
        output.appendLine(`📊 Average Commits/Day (calendar): ${avgPerCalendarDay}`);
        output.appendLine(`📊 Average Commits/Day (active days): ${avgPerActiveDay}`);
        output.appendLine(`\n${'='.repeat(60)}\n`);
        output.show(true);
    });
    context.subscriptions.push(showMetrics);
    const discover = vscode.commands.registerCommand('commitDiary.discoverRepos', async () => {
        try {
            const repos = await (0, repoDiscovery_1.discoverRepositories)();
            output.appendLine(`Discovered ${repos.length} repo(s).`);
            for (const r of repos)
                output.appendLine(`- [${r.source}] ${r.rootPath}`);
            output.show(true);
        }
        catch (e) {
            output.appendLine(`[Error] repo discovery failed: ${e.message}`);
            vscode.window.showErrorMessage(String(e));
        }
    });
    context.subscriptions.push(discover);
    // Authentication commands
    const setupApiKeyCommand = vscode.commands.registerCommand('commitDiary.login', async () => {
        if (!authManager) {
            vscode.window.showErrorMessage('CommitDiary: Authentication manager not initialized');
            return;
        }
        const isAuth = await authManager.isAuthenticated();
        if (isAuth) {
            vscode.window.showInformationMessage('CommitDiary: Cloud sync is already configured!');
            return;
        }
        // Show API key setup instructions
        await authManager.showApiKeyInstructions();
    });
    context.subscriptions.push(setupApiKeyCommand);
    const clearApiKeyCommand = vscode.commands.registerCommand('commitDiary.logout', async () => {
        if (!authManager)
            return;
        const confirm = await vscode.window.showWarningMessage('Are you sure you want to remove your API key? Cloud sync will be disabled.', { modal: true }, 'Yes, Remove It', 'Cancel');
        if (confirm === 'Yes, Remove It') {
            await authManager.clearApiKey();
        }
    });
    context.subscriptions.push(clearApiKeyCommand);
    // Sync commands
    const syncNowCommand = vscode.commands.registerCommand('commitDiary.syncNow', async () => {
        if (!syncManager) {
            vscode.window.showErrorMessage('CommitDiary: Sync manager not initialized');
            return;
        }
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) {
            vscode.window.showWarningMessage('CommitDiary: No workspace open');
            return;
        }
        const repo = (0, db_1.getRepoByPath)(root);
        if (!repo) {
            vscode.window.showWarningMessage('CommitDiary: Repository not found in database. Please scan first.');
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'CommitDiary: Syncing commits...',
            cancellable: false
        }, async () => {
            const success = await syncManager.syncToCloud(repo.id);
            if (success) {
                vscode.window.showInformationMessage('CommitDiary: Sync completed successfully');
            }
            else {
                vscode.window.showWarningMessage('CommitDiary: Sync failed. Check output for details.');
                output.show();
            }
        });
    });
    context.subscriptions.push(syncNowCommand);
    const forceFullResyncCommand = vscode.commands.registerCommand('commitDiary.forceFullResync', async () => {
        const confirm = await vscode.window.showWarningMessage('This will reset sync status and re-sync all commits to cloud. Continue?', 'Yes', 'No');
        if (confirm !== 'Yes')
            return;
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root)
            return;
        const repo = (0, db_1.getRepoByPath)(root);
        if (!repo) {
            vscode.window.showWarningMessage('CommitDiary: Repository not found. Please scan first.');
            return;
        }
        const repoId = repo.id;
        // Reset all sync-related fields for all commits in this repo
        const db = require('./db').getDB();
        db.run(`UPDATE commits 
       SET sync_status = 'pending', 
           synced_at = NULL, 
           sync_batch_id = NULL, 
           sync_error = NULL 
       WHERE repo_id = ?`, [repoId]);
        db.run(`UPDATE repos 
       SET last_synced_sha = NULL, 
           last_synced_at = NULL, 
           sync_lock = NULL 
       WHERE id = ?`, [repoId]);
        require('./db').saveDB(context);
        output.appendLine('[ForceResync] Reset sync status for all commits to pending');
        // Clear cache and rescan
        commitCacheMap.clear();
        await updateStatusBar();
        // Trigger immediate sync
        if (syncManager && await authManager.isAuthenticated()) {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'CommitDiary: Re-syncing all commits...',
                cancellable: false
            }, async () => {
                const success = await syncManager.syncToCloud(repoId);
                if (success) {
                    vscode.window.showInformationMessage('CommitDiary: Full resync completed!');
                }
                else {
                    vscode.window.showWarningMessage('CommitDiary: Resync failed. Check output.');
                    output.show();
                }
            });
        }
        else {
            vscode.window.showInformationMessage('CommitDiary: Sync status reset. Sync will occur on next scheduled run.');
        }
    });
    context.subscriptions.push(forceFullResyncCommand);
    // Export database command
    const exportDBCommand = vscode.commands.registerCommand('commitDiary.exportDB', async () => {
        try {
            const dbPath = (0, db_1.exportDatabaseFile)(context);
            const uri = vscode.Uri.file(dbPath);
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: uri,
                filters: {
                    'SQLite Database': ['sqlite', 'db']
                }
            });
            if (saveUri) {
                const fs = require('fs');
                fs.copyFileSync(dbPath, saveUri.fsPath);
                vscode.window.showInformationMessage(`CommitDiary: Database exported to ${saveUri.fsPath}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error}`);
        }
    });
    context.subscriptions.push(exportDBCommand);
    // Sync status diagnostic command
    const checkSyncStatusCommand = vscode.commands.registerCommand('commitDiary.checkSyncStatus', async () => {
        try {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            const repo = (0, db_1.getRepoByPath)(root);
            if (!repo) {
                vscode.window.showErrorMessage('Repository not found in database. Please scan first.');
                return;
            }
            const repoId = repo.id;
            const { getSyncStats, getUnsyncedCommits } = require('./db');
            const stats = getSyncStats(repoId);
            output.appendLine('\n' + '='.repeat(60));
            output.appendLine('SYNC STATUS DIAGNOSTIC');
            output.appendLine('='.repeat(60));
            output.appendLine(`Repo: ${repo.name} (ID: ${repoId})`);
            output.appendLine(`Path: ${repo.path}`);
            output.appendLine(`Sync Lock: ${repo.sync_lock || 'None'}`);
            output.appendLine(`Last Synced SHA: ${repo.last_synced_sha || 'None'}`);
            output.appendLine(`Last Synced At: ${repo.last_synced_at || 'Never'}`);
            output.appendLine('');
            output.appendLine('Commit Status Breakdown:');
            let totalCommits = 0;
            for (const stat of stats) {
                const status = stat[0];
                const count = stat[1];
                totalCommits += count;
                const emoji = status === 'synced' ? '✅' : status === 'pending' ? '⏳' : status === 'syncing' ? '🔄' : '❌';
                output.appendLine(`  ${emoji} ${status.padEnd(10)}: ${count} commits`);
            }
            output.appendLine(`\n  TOTAL: ${totalCommits} commits`);
            // Get sample of unsynced commits
            const unsynced = getUnsyncedCommits(repoId, 5);
            if (unsynced.length > 0) {
                output.appendLine('\nSample Unsynced Commits (first 5):');
                for (const commit of unsynced) {
                    const sha = commit[0];
                    const message = commit[6];
                    const syncStatus = commit[12]; // Updated index for sync_status
                    const shortMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
                    output.appendLine(`  ${sha.substring(0, 7)}: ${shortMessage} [${syncStatus}]`);
                }
            }
            else {
                output.appendLine('\n✅ No unsynced commits found!');
            }
            output.appendLine('\n' + '='.repeat(60) + '\n');
            output.show();
            vscode.window.showInformationMessage('Sync status diagnostic complete. Check output.');
        }
        catch (error) {
            output.appendLine(`[Diagnostic] Error: ${error}`);
            vscode.window.showErrorMessage(`Diagnostic failed: ${error}`);
        }
    });
    context.subscriptions.push(checkSyncStatusCommand);
    // Command to view synced commits
    const viewSyncedCommitsCommand = vscode.commands.registerCommand('commitDiary.viewSyncedCommits', async () => {
        try {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            const repo = (0, db_1.getRepoByPath)(root);
            if (!repo) {
                vscode.window.showErrorMessage('Repository not found in database. Please scan first.');
                return;
            }
            const { getDB } = require('./db');
            const db = getDB();
            const result = db.exec(`
        SELECT sha, message, date, synced_at, sync_status
        FROM commits
        WHERE repo_id = ? AND sync_status = 'synced'
        ORDER BY date DESC
        LIMIT 20
      `, [repo.id]);
            if (!result || !result[0] || result[0].values.length === 0) {
                vscode.window.showInformationMessage('No synced commits found');
                return;
            }
            output.appendLine('\n' + '='.repeat(60));
            output.appendLine('SYNCED COMMITS (Last 20)');
            output.appendLine('='.repeat(60) + '\n');
            for (const row of result[0].values) {
                const sha = row[0].substring(0, 7);
                const message = row[1].substring(0, 60);
                const date = row[2];
                const syncedAt = row[3];
                output.appendLine(`${sha} | ${date} | ${message}... | Synced: ${syncedAt}`);
            }
            output.appendLine(`\nTotal: ${result[0].values.length} commits shown\n`);
            output.show();
        }
        catch (error) {
            output.appendLine(`[ViewSynced] Error: ${error}`);
            vscode.window.showErrorMessage(`Failed to view synced commits: ${error}`);
        }
    });
    context.subscriptions.push(viewSyncedCommitsCommand);
    // Command to reset database (for testing/debugging)
    const resetDatabaseCommand = vscode.commands.registerCommand('commitDiary.resetDatabase', async () => {
        const confirm = await vscode.window.showWarningMessage('⚠️ Reset local database?\n\nThis will:\n• Delete all local commit data\n• Clear sync history\n• NOT affect your Supabase cloud data\n\nYou can rescan and re-sync commits after reset.', { modal: true }, 'Reset Database');
        if (confirm !== 'Reset Database') {
            return;
        }
        try {
            const { getDB, saveDB } = require('./db');
            const db = getDB();
            output.appendLine('[Reset] Dropping all tables...');
            // Drop all tables
            db.run('DROP TABLE IF EXISTS commit_files');
            db.run('DROP TABLE IF EXISTS commits');
            db.run('DROP TABLE IF EXISTS repos');
            db.run('DROP TABLE IF EXISTS sync_queue');
            db.run('DROP TABLE IF EXISTS metrics_cache');
            db.run('DROP TABLE IF EXISTS schema_version');
            saveDB(context);
            output.appendLine('[Reset] ✅ Database reset complete');
            output.appendLine('[Reset] Cloud data in Supabase is unchanged');
            const choice = await vscode.window.showInformationMessage('Database reset! Reload window to reinitialize and rescan commits.', 'Reload Window', 'Cancel');
            if (choice === 'Reload Window') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
        catch (error) {
            output.appendLine(`[Reset] ❌ Error: ${error}`);
            vscode.window.showErrorMessage(`Reset failed: ${error}`);
        }
    });
    context.subscriptions.push(resetDatabaseCommand);
    // API Key management - generation/revocation happens on dashboard only!
    // Users should visit the web dashboard to manage their API keys
}
function deactivate() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    if (gitWatcher) {
        gitWatcher.dispose();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (syncManager) {
        syncManager.stopAutoSync();
    }
}
//# sourceMappingURL=extension.js.map