
// src/repoDiscovery.ts
import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

export type RepoInfo = {
    rootUri: vscode.Uri;
    rootPath: string;
    source: 'git-api' | 'fs-scan';
};

export async function discoverRepositories(): Promise<RepoInfo[]> {
    const fromApi = await getReposFromGitApi().catch(() => [] as RepoInfo[]);
    // If Git API found repos, prefer those and also try to include any additional not seen by API
    const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map(f => f.uri);
    const fromScan = await scanForGitReposFromWorkspace(workspaceRoots).catch(() => [] as RepoInfo[]);
    return dedupeByRootPath([...fromApi, ...fromScan]);
}

export async function getReposFromGitApi(): Promise<RepoInfo[]> {
    const gitExt = vscode.extensions.getExtension<any>('vscode.git');
    const exportsApi = gitExt?.exports;
    if (!exportsApi || typeof exportsApi.getAPI !== 'function') return [];
    const api = exportsApi.getAPI(1);
    const repos = api?.repositories ?? [];
    return repos.map((r: any) => ({
        rootUri: r.rootUri,
        rootPath: r.rootUri.fsPath,
        source: 'git-api' as const,
    }));
}

// Workspace scan using VS Code APIs (fast). Looks for **/.git/config
export async function scanForGitReposFromWorkspace(workspaceRoots: vscode.Uri[]): Promise<RepoInfo[]> {
    if (!vscode.workspace.workspaceFolders?.length) return [];
    // Search for .git/config files; exclude large/vendor dirs
    const configs = await vscode.workspace.findFiles(
        '**/.git/config',
        '{**/node_modules/**,**/.git/**,**/.venv/**,**/.direnv/**,**/vendor/**,**/dist/**,**/build/**}',
        2000
    );
    const repos: RepoInfo[] = configs.map(u => {
        // .../<repo>/.git/config -> repo root = dirname(dirname(config))
        const repoRoot = vscode.Uri.joinPath(u, '..', '..');
        return { rootUri: repoRoot, rootPath: repoRoot.fsPath, source: 'fs-scan' as const };
    });
    return dedupeByRootPath(repos);
}

// Pure Node fallback you can unit test (no VS Code runtime required)
export async function scanForGitReposFromFs(
    roots: string[],
    opts?: { maxDepth?: number; excludes?: string[] }
): Promise<string[]> {
    const maxDepth = opts?.maxDepth ?? 5;
    const excludes = new Set(opts?.excludes ?? ['node_modules', '.git', '.venv', '.direnv', 'vendor', 'dist', 'build']);
    const found = new Set<string>();

    async function walk(dir: string, depth: number) {
        if (depth > maxDepth) return;
        let entries: any[];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
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
                    } catch {
                        // ignore if no config
                    }
                } else {
                    // .git as a file points to gitdir; consider this a repo root as well
                    found.add(path.resolve(dir));
                }
            } catch {
                // ignore
            }
            // Do not descend into this repo root further
            return;
        }
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (excludes.has(entry.name)) continue;
            await walk(path.join(dir, entry.name), depth + 1);
        }
    }

    await Promise.all(roots.map(r => walk(r, 0)));
    return Array.from(found);
}

function dedupeByRootPath(repos: RepoInfo[]): RepoInfo[] {
    const map = new Map<string, RepoInfo>();
    for (const r of repos) {
        const key = path.resolve(r.rootPath);
        if (!map.has(key)) map.set(key, r);
    }
    return Array.from(map.values());
}