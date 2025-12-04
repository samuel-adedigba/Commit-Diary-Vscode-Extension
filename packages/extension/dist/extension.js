"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// main entry point
const vscode = require("vscode");
const repoDiscovery_1 = require("./repoDiscovery");
const userIdentity_1 = require("./userIdentity");
const simple_git_1 = require("simple-git");
const gitLog_1 = require("./gitLog");
const categorizer_1 = require("./categorizer");
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
async function activate(context) {
    const output = vscode.window.createOutputChannel("CommitDiary");
    output.appendLine("CommitDiary activated!");
    // Initialize status bar for commit count display
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'commitDiary.showMyCommits';
    context.subscriptions.push(statusBarItem);
    // Auto-update on workspace changes
    const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (root && await (0, simple_git_1.default)(root).checkIsRepo()) {
            setupGitWatcher(root);
            updateStatusBar();
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
    });
    context.subscriptions.push(configWatcher);
    // Auto-fetch on activation if workspace has a Git repo
    const initialRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (initialRoot) {
        const git = (0, simple_git_1.default)(initialRoot);
        if (await git.checkIsRepo()) {
            setupGitWatcher(initialRoot);
            updateStatusBar();
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
    function scheduleStatusUpdate() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        const config = vscode.workspace.getConfiguration('commitDiary');
        const delay = config.get('debounceDelay', 2000);
        debounceTimer = setTimeout(() => updateStatusBar(), delay);
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
        if (isCacheValid && cachedData) {
            output.appendLine(`[Debug] Using cached data (HEAD: ${currentHeadSHA.substring(0, 8)})`);
            commits = cachedData.commits;
        }
        else {
            output.appendLine(`[Debug] Fetching fresh data from repository...`);
            // Try author first
            commits = await (0, gitLog_1.getCommitsByIdentity)(root, identityRegex, 500, 'author', true, timeRange);
            // If none, try committer (some merges or rebases may reflect as committer)
            if (commits.length === 0) {
                output.appendLine(`[Debug] No author matches, trying committer…`);
                commits = await (0, gitLog_1.getCommitsByIdentity)(root, identityRegex, 500, 'committer', true, timeRange);
            }
            // Update cache only if we have commits (don't cache empty/bad results)
            if (commits.length > 0) {
                commitCacheMap.set(root, {
                    repoPath: root,
                    headSHA: currentHeadSHA,
                    commits,
                    timestamp: Date.now(),
                    timeRange
                });
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
}
//# sourceMappingURL=extension.js.map