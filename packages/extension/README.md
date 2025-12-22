# Commit Diary VS Code Extension

Track, categorize, and analyze your Git commits directly in VS Code.

## Features

- **Automatic Commit Tracking**: Automatically tracks commits as you work.
- **Cloud Sync**: Sync your commit history to the Commit Diary dashboard for advanced analytics.
- **Privacy Focused**: Your code stays local; only commit metadata (hashes, timestamps, messages) is processed.
- **Offline Support**: Queues commits when offline and syncs when back online.

## Setup

1. Install the extension.
2. Register at [Commit Diary Dashboard](https://commitdiary-web.vercel.app).
3. Get your API Key.
4. Run `CommitDiary: Setup Cloud Sync` command or go to Settings and enter your API Key.

## Commands

- `CommitDiary: Show My Commits` - View your recent commits.
- `CommitDiary: Setup Cloud Sync` - Configure your API key.
- `CommitDiary: Show Commit Metrics` - View productivity metrics.
- `CommitDiary: Discover Repositories` - Scan workspace for git repositories.
- `CommitDiary: Sync Now` - Manually trigger a sync.

## Settings

- `commitDiary.sync.enabled`: Enable/disable cloud sync.
- `commitDiary.sync.autoInterval`: Set auto-sync interval (hourly, daily).
- `commitDiary.sync.includeEmails`: Include author emails in sync (default: false).

## License

ISC
