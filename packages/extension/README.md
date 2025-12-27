
# Commit Diary VS Code Extension

> Track, categorize, and explain your Git work with clarity—auto-sync, badge, and actionable insights for developers and teams.

---

<!-- ![Commit Diary Badge](https://commitdiary-web.vercel.app/api/badge?user=YOUR_USERNAME) -->
Check out the [Commit Diary Dashboard](https://commitdiary-web.vercel.app/documentation) for more information.

_Replace `YOUR_USERNAME` with your actual Commit Diary username._

---

## 🚀 Features

- **Automatic Commit Tracking**: Commits are tracked as you work, no manual steps required.
- **Real-Time Cloud Sync**: New commits are synced to the cloud instantly (on commit) and on a schedule (hourly/daily).
- **Shareable Badge**: Show off your progress and streaks with a dynamic SVG badge for your README, portfolio, or dashboard.
- **Privacy Focused**: Only commit metadata (hash, timestamp, message) is processed—your code stays local.
- **Offline Support**: Commits are queued and synced automatically when you’re back online.
- **Productivity Metrics**: View commit stats, trends, and breakdowns in VS Code and on the dashboard.

---

## ✨ Why Commit Diary?

**Commit Diary helps developers understand, explain, and track their work — not just record it.**

While Git tools are great at showing *what changed*, they often fall short when it comes to answering:

> *What did I actually work on?*
> *Why does it matter?*
> *How do I explain this clearly to others?*

Commit Diary bridges that gap by turning raw Git commit history into meaningful, human-readable insights.

---

## 🚧 The Problem with Traditional Git Insights

* Git commit history is **chronological**, not **contextual**
* GitHub contribution graphs show *how much* you worked, not *what you worked on*
* GitLens provides deep file-level history, but can feel **too granular** for progress reporting
* Developers still spend time **manually summarizing work** for standups, reports, and reviews

---

## 💡 What Makes Commit Diary Different

### 🧠 Work-centric insights

* Categorizes commits by **intent** (feature, fix, refactor, docs, config, etc.)
* Detects **components and code areas** based on file paths
* Surfaces *what changed and why*, not just diffs

### 📊 Metrics that tell a story

* Daily, weekly, monthly, and yearly summaries
* Commit breakdowns by category and component
* Clear productivity patterns without noise or surveillance

### ✍️ Built for communication

* Designed to help you **explain your work clearly**
* Ideal for daily standups, weekly reports, retrospectives, and self-reviews
* Outputs human-readable summaries instead of raw Git logs

### 🔒 Local-first & privacy-respecting

* Commit analysis runs **locally by default**
* Cloud sync is optional and fully user-controlled
* No background tracking, no forced uploads

---

## 🔄 How Commit Diary Fits with Existing Tools

| Tool             | Primary Focus                     |
| ---------------- | --------------------------------- |
| GitHub Graph     | Activity volume                   |
| GitLens          | Deep code history & blame         |
| **Commit Diary** | Work summary & progress narrative |

Commit Diary doesn’t replace GitLens or GitHub — it **sits above them**, transforming low-level Git data into high-level insight.

---

## 🎯 When Commit Diary Shines

* Daily standups and async updates
* Weekly or monthly progress reports
* Tracking refactors, configs, and technical debt
* Showing real impact beyond commit counts
* Personal progress tracking across multiple projects

**Commit Diary is about clarity, not clutter.**
It helps developers tell the story behind their code — simply, honestly, and effectively.

---

---

## 🛠️ Getting Started (Initial Setup)

1. **Install the Extension**
	 - Search for `Commit Diary` in the VS Code Marketplace and install.

2. **Register on the Dashboard**
	 - Go to [Commit Diary Dashboard](https://commitdiary-web.vercel.app).
	 - Sign up with GitHub/Google and generate your **API Key** from your profile/settings.

3. **Enter Your API Key in VS Code**
	 - Open VS Code settings (`Ctrl+,` or `Cmd+,`).
	 - Search for `CommitDiary: Api Key` and paste your API key.
	 - Or run the command: `CommitDiary: Setup Cloud Sync` from the Command Palette (`Ctrl+Shift+P`).

4. **That’s It!**
	 - The extension will automatically scan your workspace for Git repositories, track your commits, and sync them to the cloud.
	 - No manual sync is needed—everything is automatic.

---

---

## 🔄 How Sync Works

- **Auto-Sync on New Commits**: As soon as you make a new commit, the extension detects it and syncs it to the cloud (if your API key is set).
- **Scheduled Sync**: In addition to real-time sync, the extension runs a scheduled sync (hourly/daily) to ensure nothing is missed.
- **Offline Mode**: If you’re offline, commits are queued and synced when you reconnect.
- **No Manual Triggers Needed**: After initial setup, everything is background and automatic.

---

---

## 🧑‍💻 Common Commands

- `CommitDiary: Show My Commits` — View your recent commits in VS Code.
- `CommitDiary: Setup Cloud Sync` — Enter or update your API key.
- `CommitDiary: Show Commit Metrics` — View productivity metrics and trends.
- `CommitDiary: Discover Repositories` — Scan your workspace for Git repositories.
- `CommitDiary: Sync Now` — Manually trigger a sync (rarely needed).
- `CommitDiary: Force Full Resync` — Reset sync status and re-sync all commits.
- `CommitDiary: Export DB` — Export your local commit database.

---

---

## ⚙️ Key Settings

- `commitDiary.apiKey`: Your personal API key for cloud sync (required).
- `commitDiary.autoSync.onDetection`: Enable/disable auto-sync when new commits are detected (default: true).
- `commitDiary.sync.autoInterval`: Set scheduled auto-sync interval (`hourly`, `daily`).
- `commitDiary.sync.includeEmails`: Include author emails in sync (default: false).
- `commitDiary.user.emails`: Additional emails to match your commits (optional).

---

---

## 🆘 Troubleshooting & Help

- **No Commits Synced?**
	- Make sure your API key is set in VS Code settings.
	- Check the Output panel (`View > Output`, select `CommitDiary`) for errors.
	- Ensure your workspace is a Git repository.

- **API Key Issues?**
	- You can always generate a new API key from the [dashboard](https://commitdiary-web.vercel.app/pages/settings).
	- Update it in VS Code settings if you change it.

- **Extension Not Syncing?**
	- Make sure `commitDiary.autoSync.onDetection` is enabled (default: true).
	- Check your internet connection.
	- Try running `CommitDiary: Sync Now` from the Command Palette.

- **Need More Help?**
	- Visit the [Commit Diary Dashboard](https://commitdiary-web.vercel.app) for docs and support.
	- Open an issue on [GitHub](https://github.com/samuel-adedigba/Commit-Diary-Vscode-Extension).

---

---

## 🏅 Shareable Badge SVG

Show off your progress and consistency with a **dynamic badge**! Commit Diary generates a shareable SVG badge that you can embed in your README, portfolio, or personal site.

**Why is this useful?**
- Instantly showcase your recent activity and commitment streaks.
- Great for resumes, GitHub profiles, and team dashboards.
- Visual motivation and accountability for yourself and your team.

---

## 📲 Upcoming: Scheduled Reports to WhatsApp & Slack

Stay updated on your work—**without opening the dashboard**. Soon, Commit Diary will let you receive:

- **Short, human-readable work summaries** delivered to WhatsApp or Slack
- Scheduled digests (daily, weekly, or custom)
- Shareable snippets for standups, reviews, or personal tracking

**Why is this useful?**
- Get a quick snapshot of your progress, even on the go
- No need to check the web dashboard for updates
- Perfect for async teams, remote work, and personal productivity

_Watch this space for updates and join our community to help shape these features!_

---

## License

ISC
