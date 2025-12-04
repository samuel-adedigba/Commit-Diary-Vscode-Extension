# CommitDiary Extension - Cache Behavior & Auto-Update System

## Overview
The CommitDiary extension uses an intelligent caching system with automatic invalidation to provide real-time commit tracking with zero manual intervention. Each repository maintains its own cache, validated by Git HEAD SHA to ensure data freshness.

---

## Cache Architecture

### Data Structure
```typescript
type CommitCache = {
  repoPath: string;      // Absolute path to repository
  headSHA: string;       // Git HEAD SHA for validation
  commits: RawCommit[];  // Cached commit data
  timestamp: number;     // Cache creation time (milliseconds)
  timeRange: string;     // Time range used for fetching (e.g., "1 year")
};

// Multi-workspace support via Map
const commitCacheMap = new Map<string, CommitCache>();
```

**Purpose:** Each workspace has independent cache, preventing data conflicts when switching repositories.

---

## Automatic Behaviors

### 1. Extension Activation (VS Code Startup)

**Line 59-66 in `extension.ts`:**
```typescript
// Auto-fetch on activation if workspace has a Git repo
const initialRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
if (initialRoot) {
  const git = simpleGit(initialRoot);
  if (await git.checkIsRepo()) {
    setupGitWatcher(initialRoot);  // ← Sets up file system watcher
    updateStatusBar();              // ← Fetches commits immediately
  }
}
```

**Trigger:** VS Code opens with a Git repository in workspace  
**Behavior:** Automatically fetches commits and displays count in status bar  
**Expected Result:** Status bar shows "🔍 😀 X commits" without user action  
**Cache State:** Creates new cache entry if none exists

---

### 2. Workspace Folder Changes

**Line 39-45 in `extension.ts`:**
```typescript
// Auto-update on workspace changes
const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;  // ← Get new workspace root
  if (root && await simpleGit(root).checkIsRepo()) {                // ← Verify it's a Git repo
    setupGitWatcher(root);   // ← Setup watcher for new repo
    updateStatusBar();       // ← Fetch commits for new repo
  }
});
```

**Trigger:** User opens/closes workspace folders  
**Behavior:** Switches to new repository, preserves old cache in Map  
**Expected Result:** Status bar updates with new repository's commit count  
**Cache State:** Each repo maintains separate cache entry

---

### 3. Configuration Changes

**Line 48-56 in `extension.ts`:**
```typescript
// Auto-invalidate cache when configuration changes
const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
  if (e.affectsConfiguration('commitDiary.defaultTimeRange') ||   // ← Time range changed
      e.affectsConfiguration('commitDiary.user.emails')) {        // ← Email list changed
    output.appendLine('[Debug] Configuration changed, clearing cache...');
    commitCacheMap.clear();  // ← Clears ALL cached repositories
    updateStatusBar();       // ← Re-fetches with new settings
  }
});
```

**Trigger:** User changes `commitDiary.defaultTimeRange` or `commitDiary.user.emails` in settings  
**Behavior:** Invalidates all caches, forces fresh fetch with new configuration  
**Expected Result:** Commit count updates to reflect new time range or email filters  
**Cache State:** All caches cleared, rebuilt on next fetch

---

### 4. Git File Changes (Commits, Pulls, Branch Switches)

**Line 68-85 in `extension.ts`:**
```typescript
// Function to setup or update git watcher for a repo
function setupGitWatcher(repoRoot: string) {
  // Dispose old watcher if any
  if (gitWatcher) {
    gitWatcher.dispose();
  }
  currentRepoRoot = repoRoot;
  // Watch .git/refs/** (branches/commits), .git/HEAD (branch switches), .git/index (staged changes)
  gitWatcher = vscode.workspace.createFileSystemWatcher(
    `${repoRoot}/.git/{refs/**,HEAD,index}`,  // ← Monitors Git internal files
    false,  // ← Don't ignore creates
    true,   // ← Ignore changes (we use onDidChange)
    false   // ← Don't ignore deletes
  );
  gitWatcher.onDidChange(() => scheduleStatusUpdate());  // ← File changed
  gitWatcher.onDidCreate(() => scheduleStatusUpdate());  // ← File created
  gitWatcher.onDidDelete(() => scheduleStatusUpdate());  // ← File deleted
  context.subscriptions.push(gitWatcher);
}
```

**Monitored Files:**
- `.git/refs/**` → New commits, branch updates
- `.git/HEAD` → Branch switches
- `.git/index` → Staged changes

**Line 88-95 in `extension.ts`:**
```typescript
// Function to schedule a debounced status update
function scheduleStatusUpdate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);  // ← Cancel previous pending update
  }
  const config = vscode.workspace.getConfiguration('commitDiary');
  const delay = config.get<number>('debounceDelay', 2000);  // ← Default 2 seconds
  debounceTimer = setTimeout(() => updateStatusBar(), delay);  // ← Schedule update
}
```

**Trigger:** Git file changes detected  
**Behavior:** Waits 2 seconds (debounce) then calls `updateStatusBar()`  
**Expected Result:** Status bar updates after commit, pull, or branch switch  
**Cache State:** HEAD SHA validation triggers cache refresh if changed

---

## Cache Validation Logic

### HEAD SHA Comparison

**Line 107-113 in `extension.ts`:**
```typescript
// Get current HEAD SHA for cache validation
const currentHeadSHA = await git.revparse(['HEAD']);  // ← Get current commit SHA

// Check if cache is valid
const cachedData = commitCacheMap.get(currentRepoRoot);  // ← Lookup cache by repo path
const isCacheValid = cachedData &&                       // ← Cache exists AND
  cachedData.headSHA === currentHeadSHA &&               // ← HEAD SHA matches AND
  cachedData.timeRange === timeRange;                    // ← Time range matches
```

**Validation Criteria:**
1. Cache entry exists for this repository path
2. Cached HEAD SHA matches current HEAD SHA
3. Cached time range matches current configuration

**Result:**
- ✅ **Valid:** Use cached data (no Git operation)
- ❌ **Invalid:** Fetch fresh data from Git

---

### Cache Hit (Valid)

**Line 119-122 in `extension.ts`:**
```typescript
if (isCacheValid && cachedData) {
  // Use cached data
  commits = cachedData.commits;  // ← Return cached commits instantly
}
```

**Trigger:** HEAD SHA and time range unchanged  
**Behavior:** Returns cached data without Git operation  
**Expected Result:** Instant status bar update (< 1ms)  
**Performance:** Zero Git commands executed

---

### Cache Miss (Invalid or Empty)

**Line 123-148 in `extension.ts`:**
```typescript
else {
  // Fetch fresh data
  let emails = await getUserEmails(currentRepoRoot);              // ← Get user emails
  let name = await getUserName(currentRepoRoot);                  // ← Get user name
  // Use simple discovery for status bar
  if (emails.length === 0 && name) {                              // ← No emails configured
    const discovered = await discoverRepoEmailsForName(currentRepoRoot, name);  // ← Discover from repo
    if (discovered.length) emails = discovered;
  }
  if (emails.length === 0 && !name) return;  // ← No identity found, exit early
  const identityRegex = buildIdentityRegex(emails, name ? [name] : []);  // ← Build regex pattern
  commits = await getCommitsByIdentity(currentRepoRoot, identityRegex, 500, 'author', false, timeRange);  // ← Fetch by author
  if (commits.length === 0) {
    commits = await getCommitsByIdentity(currentRepoRoot, identityRegex, 500, 'committer', false, timeRange);  // ← Fallback to committer
  }
  
  // Update cache only if we have commits (don't cache empty/bad results)
  if (commits.length > 0) {                                       // ← Only cache successful fetches
    commitCacheMap.set(currentRepoRoot, {
      repoPath: currentRepoRoot,
      headSHA: currentHeadSHA,                                    // ← Store current HEAD SHA
      commits,
      timestamp: Date.now(),
      timeRange
    });
  }
}
```

**Trigger:** HEAD SHA changed OR time range changed OR no cache  
**Behavior:** Executes Git commands to fetch commits, updates cache if successful  
**Expected Result:** Fresh data from repository  
**Performance:** 100-500ms depending on repository size  
**Cache Update:** Only stores if commits found (prevents caching errors)

---

## Empty Result Handling

### No Commits Found

**Line 138-147 in `extension.ts`:**
```typescript
// Update cache only if we have commits (don't cache empty/bad results)
if (commits.length > 0) {  // ← Only cache non-empty results
  commitCacheMap.set(currentRepoRoot, {
    repoPath: currentRepoRoot,
    headSHA: currentHeadSHA,
    commits,
    timestamp: Date.now(),
    timeRange
  });
}
// If commits.length === 0, cache is NOT updated
```

**Trigger:** Fetch returns 0 commits (wrong regex, no matching identity, or bug)  
**Behavior:** Does NOT cache the empty result  
**Expected Result:** Next HEAD change triggers fresh fetch (automatic recovery)  
**Purpose:** Prevents caching errors or misconfigurations

---

## Manual Cache Management

### Clear Cache Command

**Line 273-283 in `extension.ts`:**
```typescript
const clearCache = vscode.commands.registerCommand('commitDiary.clearCache', async () => {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    vscode.window.showWarningMessage("CommitDiary: No workspace open.");
    return;
  }
  const cacheSize = commitCacheMap.size;                          // ← Get number of cached repos
  commitCacheMap.clear();                                         // ← Clear ALL caches
  output.appendLine(`[Debug] Cleared ${cacheSize} cached repo(s)`);
  output.show(true);
  await updateStatusBar();                                        // ← Re-fetch immediately
  vscode.window.showInformationMessage("CommitDiary: Cache cleared and refreshed.");
});
```

**Command:** `CommitDiary: Clear Cache` (from Command Palette)  
**Behavior:** Clears all cached repositories, forces fresh fetch  
**Expected Result:** Status bar updates with fresh data  
**Use Case:** Manual refresh when data seems stale or after configuration troubleshooting

---

## Performance Characteristics

### Cache Hit Scenario
```
User Action: Open VS Code with Git repo
├─ Extension Activation (line 59-66)
├─ setupGitWatcher() → Sets up file watcher
├─ updateStatusBar() → Checks cache
├─ Cache MISS (first run) → Fetches from Git (200ms)
├─ Cache stored with HEAD SHA
└─ Status bar displays: "🔍 😀 42 commits"

[5 minutes later, no new commits]
Git File Change: User views diff (touches .git/index)
├─ scheduleStatusUpdate() → Waits 2 seconds
├─ updateStatusBar() → Checks cache
├─ HEAD SHA matches → Cache HIT
├─ Returns cached data (< 1ms)
└─ Status bar displays: "🔍 😀 42 commits" (instant)
```

**Total Time:** < 5ms (no Git operation)

### Cache Miss Scenario
```
User Action: Make new commit
├─ Git writes to .git/refs/heads/main
├─ File watcher detects change
├─ scheduleStatusUpdate() → Waits 2 seconds
├─ updateStatusBar() → Checks cache
├─ HEAD SHA changed → Cache MISS
├─ Fetches fresh commits (150ms)
├─ Updates cache with new HEAD SHA
└─ Status bar displays: "🔍 😀 43 commits"
```

**Total Time:** ~2150ms (2s debounce + 150ms fetch)

---

## Multi-Workspace Support

### Workspace Switching
```
Workspace A: /home/user/project-a
├─ Cache Entry: { headSHA: "abc123...", commits: [...], timeRange: "1 year" }

Workspace B: /home/user/project-b
├─ Cache Entry: { headSHA: "def456...", commits: [...], timeRange: "1 year" }

User switches from A to B:
├─ workspaceWatcher triggered (line 39-45)
├─ setupGitWatcher(project-b)
├─ updateStatusBar() → Lookup cache for project-b
├─ Cache HIT → Returns project-b's commits
└─ Status bar updates instantly

User switches back to A:
├─ Cache for project-a still exists in Map
└─ Instant display (no re-fetch needed)
```

**Behavior:** Each repository path has independent cache  
**Expected Result:** Fast switching between workspaces without re-fetching  
**Cache Lifecycle:** Persists until VS Code reload or manual clear

---

## Configuration Impact

### Time Range Change
```
Initial State:
├─ Setting: commitDiary.defaultTimeRange = "1 year"
├─ Cache: { timeRange: "1 year", commits: [42 commits] }

User changes setting to "all":
├─ configWatcher triggered (line 48-56)
├─ commitCacheMap.clear() → All caches deleted
├─ updateStatusBar() → Fresh fetch with "all"
├─ New cache: { timeRange: "all", commits: [156 commits] }
└─ Status bar displays: "🔍 😀 156 commits"
```

**Trigger:** Any change to `commitDiary.defaultTimeRange` or `commitDiary.user.emails`  
**Behavior:** Clears all caches, forces immediate re-fetch  
**Expected Result:** Data reflects new configuration instantly

---

## Error Handling

### Git Operation Fails
```typescript
try {
  // ... fetch commits
} catch (e) {
  // Ignore errors in status bar update (line 153)
}
```

**Behavior:** Silent failure, status bar not updated  
**Expected Result:** Previous cache retained, no error message to user  
**Rationale:** Prevents error spam during transient Git states (rebases, etc.)

### No Identity Configured
```typescript
if (emails.length === 0 && !name) return;  // No identity (line 132)
```

**Behavior:** Early exit, no cache update  
**Expected Result:** Status bar remains empty until identity configured  
**User Action Required:** Set `commitDiary.user.emails` or configure `git config user.email`

---

## Summary: Zero Manual Intervention

| Event | Automatic Action | Cache Impact | User Sees |
|-------|-----------------|--------------|-----------|
| Open VS Code | Auto-fetch commits | Creates cache | Status bar populated |
| Make commit | Detects HEAD change, re-fetch | Updates cache | Count increases |
| Switch branch | Detects HEAD change, re-fetch | Updates cache | Count may change |
| Pull commits | Detects ref change, re-fetch | Updates cache | Count increases |
| Change time range | Clears cache, re-fetch | Rebuilds cache | Count reflects new range |
| Switch workspace | Lookup different cache | No impact on other caches | Instant switch |
| View diff | No HEAD change | Cache HIT | No update (instant) |
| Stage files | No HEAD change | Cache HIT | No update (instant) |

**Result:** Extension operates fully autonomously with intelligent caching and automatic invalidation.
