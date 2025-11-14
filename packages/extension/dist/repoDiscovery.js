"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverRepositories = discoverRepositories;
exports.getReposFromGitApi = getReposFromGitApi;
exports.scanForGitReposFromWorkspace = scanForGitReposFromWorkspace;
exports.scanForGitReposFromFs = scanForGitReposFromFs;
// src/repoDiscovery.ts
const vscode = require("vscode");
const path = require("node:path");
const fs = require("node:fs/promises");
async function discoverRepositories() {
    const fromApi = await getReposFromGitApi().catch(() => []);
    // If Git API found repos, prefer those and also try to include any additional not seen by API
    const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map(f => f.uri);
    const fromScan = await scanForGitReposFromWorkspace(workspaceRoots).catch(() => []);
    return dedupeByRootPath([...fromApi, ...fromScan]);
}
async function getReposFromGitApi() {
    const gitExt = vscode.extensions.getExtension('vscode.git');
    const exportsApi = gitExt?.exports;
    if (!exportsApi || typeof exportsApi.getAPI !== 'function')
        return [];
    const api = exportsApi.getAPI(1);
    const repos = api?.repositories ?? [];
    return repos.map((r) => ({
        rootUri: r.rootUri,
        rootPath: r.rootUri.fsPath,
        source: 'git-api',
    }));
}
// Workspace scan using VS Code APIs (fast). Looks for **/.git/config
async function scanForGitReposFromWorkspace(workspaceRoots) {
    if (!vscode.workspace.workspaceFolders?.length)
        return [];
    // Search for .git/config files; exclude large/vendor dirs
    const configs = await vscode.workspace.findFiles('**/.git/config', '{**/node_modules/**,**/.git/**,**/.venv/**,**/.direnv/**,**/vendor/**,**/dist/**,**/build/**}', 2000);
    const repos = configs.map(u => {
        // .../<repo>/.git/config -> repo root = dirname(dirname(config))
        const repoRoot = vscode.Uri.joinPath(u, '..', '..');
        return { rootUri: repoRoot, rootPath: repoRoot.fsPath, source: 'fs-scan' };
    });
    return dedupeByRootPath(repos);
}
// Pure Node fallback you can unit test (no VS Code runtime required)
async function scanForGitReposFromFs(roots, opts) {
    const maxDepth = opts?.maxDepth ?? 5;
    const excludes = new Set(opts?.excludes ?? ['node_modules', '.git', '.venv', '.direnv', 'vendor', 'dist', 'build']);
    const found = new Set();
    async function walk(dir, depth) {
        if (depth > maxDepth)
            return;
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        const names = new Set(entries.map(e => e.name));
        if (names.has('.git')) {
            const gitDir = path.join(dir, '.git');
            try {
                const stat = await fs.stat(gitDir);
                // .git can be a dir or a file (worktrees/submodules). If dir, check config file.
                if (stat.isDirectory()) {
                    const cfg = path.join(gitDir, 'config');
                    try {
                        await fs.access(cfg);
                        found.add(path.resolve(dir));
                    }
                    catch {
                        // ignore if no config
                    }
                }
                else {
                    // .git as a file points to gitdir; consider this a repo root as well
                    found.add(path.resolve(dir));
                }
            }
            catch {
                // ignore
            }
            // Do not descend into this repo root further
            return;
        }
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            if (excludes.has(entry.name))
                continue;
            await walk(path.join(dir, entry.name), depth + 1);
        }
    }
    await Promise.all(roots.map(r => walk(r, 0)));
    return Array.from(found);
}
function dedupeByRootPath(repos) {
    const map = new Map();
    for (const r of repos) {
        const key = path.resolve(r.rootPath);
        if (!map.has(key))
            map.set(key, r);
    }
    return Array.from(map.values());
}
//# sourceMappingURL=repoDiscovery.js.map