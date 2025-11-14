"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommitsByIdentity = getCommitsByIdentity;
const simple_git_1 = require("simple-git");
async function getCommitsByIdentity(repoRoot, identityRegex, maxCount = 50, field = 'author', includeFiles = false) {
    const git = (0, simple_git_1.default)(repoRoot);
    // Build args with strict formatting and ISO dates; no shell expansion.
    // Limit to last year to prevent scanning entire history on large repos
    const args = [
        'log',
        `--extended-regexp`,
        `-n`, String(maxCount),
        `--since`, '1 year ago',
        `--${field}`, identityRegex,
        '--date=iso-strict',
        '--pretty=%H%x1f%an%x1f%ae%x1f%ad%x1f%s'
    ];
    if (includeFiles) {
        args.push('--name-only');
    }
    try {
        const out = await git.raw(args);
        const lines = out.split('\n').filter(Boolean);
        const commits = [];
        let currentCommit = null;
        for (const line of lines) {
            if (line.includes('\x1f')) {
                // This is a commit line
                const parts = line.split('\x1f');
                if (parts.length < 5)
                    continue;
                const [sha, an, ae, ad, msg] = parts;
                currentCommit = { sha, authorName: an, authorEmail: ae, date: ad, message: msg, files: [] };
                commits.push(currentCommit);
            }
            else if (currentCommit && line.trim()) {
                // This is a file line (only if we're in a commit and line is not empty)
                currentCommit.files.push(line.trim());
            }
        }
        return commits;
    }
    catch (error) {
        // If git command fails (e.g. invalid date or git issue), return empty array
        console.error('Error executing git log for identity:', error);
        return [];
    }
}
//# sourceMappingURL=gitLog.js.map