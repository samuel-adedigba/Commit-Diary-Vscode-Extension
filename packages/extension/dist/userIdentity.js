"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserEmails = getUserEmails;
exports.buildAuthorRegex = buildAuthorRegex;
exports.getUserName = getUserName;
exports.discoverRepoEmailsForName = discoverRepoEmailsForName;
exports.buildIdentityRegex = buildIdentityRegex;
const vscode = require("vscode");
const simple_git_1 = require("simple-git");
const ESC = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Retrieves user email addresses from settings or git configuration.
 * Falls back to repository-local, then global git config, otherwise returns empty array.
 */
async function getUserEmails(repoRoot) {
    const cfg = vscode.workspace.getConfiguration('commitDiary');
    const emailsFromSettings = (cfg.get('user.emails') ?? [])
        .map(s => s.trim())
        .filter(Boolean);
    if (emailsFromSettings.length > 0)
        return dedupe(emailsFromSettings);
    const git = (0, simple_git_1.default)(repoRoot);
    const local = await getGitConfig(git, 'user.email');
    if (local)
        return [local];
    const global = await getGitConfig(git, 'user.email', true);
    return global ? [global] : [];
}
/**
 * Builds a regex pattern that matches any of the provided emails or extra names, case-insensitively.
 */
function buildAuthorRegex(emails, extraNames = []) {
    const parts = [...emails.map(ESC), ...extraNames.map(ESC)].filter(Boolean);
    if (parts.length === 0)
        return '';
    // Wrap in grouping for safety; git uses ERE and is case-insensitive with --regexp-ignore-case
    return `(${parts.join('|')})`;
}
/**
 * Retrieves the user name from git configuration.
 * Falls back to global config if repository-local is not found.
 */
async function getUserName(repoRoot) {
    const git = (0, simple_git_1.default)(repoRoot);
    const local = await getGitConfig(git, 'user.name');
    return local || await getGitConfig(git, 'user.name', true);
}
/**
 * Retrieves git config value for a key, optionally global.
 */
async function getGitConfig(git, key, isGlobal = false) {
    const args = isGlobal ? ['config', '--global', '--get', key] : ['config', '--get', key];
    return await tryRaw(git, args);
}
/**
 * Discovers email addresses used by a specific user name in the repository's commit history.
 * @param repoRoot Path to the repository root.
 * @param userName The user name to match against authors.
 * @returns Array of unique email addresses.
 */
async function discoverRepoEmailsForName(repoRoot, userName) {
    const git = (0, simple_git_1.default)(repoRoot);
    const out = await tryRaw(git, ['shortlog', '-sne', '--all', '--since', '1 year ago']);
    if (!out)
        return [];
    const emails = new Set();
    for (const line of out.split('\n')) {
        const match = line.match(/^\s*\d+\s+(.+?)\s+<([^>]+)>/);
        if (match) {
            const name = match[1].trim();
            const email = match[2].trim();
            if (eqIC(name, userName))
                emails.add(email);
        }
    }
    return Array.from(emails);
}
/**
 * Builds a regex pattern that matches any of the provided emails or names, case-insensitively.
 * Used for filtering author/committer information in git logs.
 */
function buildIdentityRegex(emails, names = []) {
    const parts = [...emails.map(ESC), ...names.map(ESC)].filter(Boolean);
    if (parts.length === 0)
        return '';
    return `(${parts.join('|')})`;
}
/**
 * Attempts to execute a git command and returns the trimmed output or null on failure.
 */
async function tryRaw(git, args) {
    try {
        const out = await git.raw(args);
        const trimmed = out.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    catch {
        return null;
    }
}
function dedupe(arr) {
    return Array.from(new Set(arr));
}
function eqIC(a, b) {
    return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
}
//# sourceMappingURL=userIdentity.js.map