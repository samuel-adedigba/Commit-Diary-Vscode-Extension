import * as vscode from 'vscode';
import simpleGit, { SimpleGit } from 'simple-git';

export type RawCommit = {
    sha: string;
    authorName: string;
    authorEmail: string;
    date: string; // ISO
    message: string;
    files: string[];
};

export async function getCommitsByIdentity(
    repoRoot: string,
    identityRegex: string,
    maxCount = 50,
    field: 'author' | 'committer' = 'author',
    includeFiles = false,
    timeRange: string = '1 year'
): Promise<RawCommit[]> {
    const git: SimpleGit = simpleGit(repoRoot);

    const args = [
        'log',
        `--extended-regexp`,
        `-n`, String(maxCount),
        `--${field}`, identityRegex,
        '--date=iso-strict',
        '--pretty=%H%x1f%an%x1f%ae%x1f%ad%x1f%s'
    ];

    // Map timeRange to git --since argument (skip for 'all')
    if (timeRange !== 'all') {
        args.splice(4, 0, '--since', timeRange + ' ago'); // Insert after -n and maxCount
    }

    if (includeFiles) {
        args.push('--name-only');
    }

    try {
        const out = await git.raw(args);
        const lines = out.split('\n').filter(Boolean);

        const commits: RawCommit[] = [];
        let currentCommit: RawCommit | null = null;

        for (const line of lines) {
            if (line.includes('\x1f')) {
                // This is a commit line
                const parts = line.split('\x1f');
                if (parts.length < 5) continue;
                const [sha, an, ae, ad, msg] = parts;
                currentCommit = { sha, authorName: an, authorEmail: ae, date: ad, message: msg, files: [] };
                commits.push(currentCommit);
            } else if (currentCommit && line.trim()) {
                // This is a file line (only if we're in a commit and line is not empty)
                currentCommit.files.push(line.trim());
            }
        }

        return commits;
    } catch (error) {
        // If git command fails (e.g. invalid date or git issue), return empty array
        return [];
    }
}
