#!/usr/bin/env bash
set -e

echo "🚀 Setting up CommitDiary full monorepo (core + extension + web dashboard)..."

# --- Root / Workspace ---
# Create clean JSON for root package
cat <<'EOF' > package.json
{
  "name": "commitdiary",
  "private": true,
  "version": "1.0.0",
  "scripts": {}
}
EOF

# Initialize workspace layout
cat <<'EOF' > pnpm-workspace.yaml
packages:
  - "packages/*"
EOF

mkdir -p packages/{core,extension,web-dashboard,api}

########################################
# CORE PACKAGE
########################################
cd packages/core
echo '{"name":"@commitdiary/core","version":"1.0.0","main":"dist/index.js"}' > package.json
pnpm add -D typescript @types/node
npx tsc --init --rootDir src --outDir dist --esModuleInterop --resolveJsonModule --module commonjs --target ES2020

mkdir -p src
cat <<'EOF' > src/index.ts
export * from "./categorizer";
export * from "./metrics";
export * from "./parser";
EOF

cat <<'EOF' > src/categorizer.ts
export function categorizeCommit(msg: string) {
  if (/^feat:/i.test(msg)) return "Feature";
  if (/^fix:/i.test(msg)) return "Fix";
  if (/^refactor:/i.test(msg)) return "Refactor";
  if (/^docs:/i.test(msg)) return "Docs";
  if (/^test:/i.test(msg)) return "Test";
  return "Other";
}
EOF

cat <<'EOF' > src/metrics.ts
export function groupByPeriod(commits: any[], period: "daily"|"weekly"|"monthly"|"yearly") {
  const grouped: Record<string, any[]> = {};
  for (const c of commits) {
    const key = new Date(c.date).toISOString().slice(0, 10);
    grouped[key] = grouped[key] || [];
    grouped[key].push(c);
  }
  return grouped;
}
EOF

cat <<'EOF' > src/parser.ts
export interface Commit {
  message: string;
  date: string;
  author: string;
  files?: string[];
}

export function parseGitLog(log: string): Commit[] {
  const lines = log.trim().split("\\n");
  return lines.map(line => {
    const [date, ...msg] = line.split(" | ");
    return { date, message: msg.join(" | "), author: "unknown" };
  });
}
EOF

cd ../../

########################################
# VS CODE EXTENSION
########################################
cd packages/extension
echo '{"name":"commitdiary-extension","version":"1.0.0","main":"dist/extension.js"}' > package.json
pnpm add -D typescript @types/node vscode esbuild @types/vscode
pnpm add simple-git
mkdir -p src

cat <<'EOF' > src/extension.ts
import * as vscode from "vscode";
import simpleGit from "simple-git";
import { categorizeCommit } from "@commitdiary/core/categorizer";

export async function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("CommitDiary");
  output.appendLine("CommitDiary activated!");

  const disposable = vscode.commands.registerCommand(
    "commitdiary.showCommits",
    async () => {
      try {
        const git = simpleGit(vscode.workspace.rootPath || ".");
        const logs = await git.log({ n: 10 });
        logs.all.forEach(log => {
          const category = categorizeCommit(log.message);
          output.appendLine(\`\${log.date} — [\${category}] \${log.message}\`);
        });
        output.show();
      } catch (err) {
        vscode.window.showErrorMessage(String(err));
      }
    }
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
EOF

cd ../../

########################################
# WEB DASHBOARD (Next.js + Tailwind + Supabase)
########################################
cd packages/web-dashboard
echo '{"name":"@commitdiary/web-dashboard","version":"1.0.0"}' > package.json
pnpm dlx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --no-git --import-alias "@/*"
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs

# Minimal Supabase client setup
cat <<'EOF' > src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
EOF

# Add basic auth UI for GitHub & Google
cat <<'EOF' > src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (provider: "github" | "google") => {
    await supabase.auth.signInWithOAuth({ provider });
  };
  const signOut = async () => await supabase.auth.signOut();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-4xl font-bold">CommitDiary Dashboard</h1>
      {session ? (
        <>
          <p className="text-gray-600">Welcome, {session.user.email}</p>
          <button onClick={signOut} className="px-4 py-2 bg-red-600 text-white rounded">
            Sign Out
          </button>
        </>
      ) : (
        <div className="flex gap-4">
          <button onClick={() => signIn("github")} className="px-4 py-2 bg-gray-800 text-white rounded">
            Sign in with GitHub
          </button>
          <button onClick={() => signIn("google")} className="px-4 py-2 bg-blue-600 text-white rounded">
            Sign in with Google
          </button>
        </div>
      )}
    </main>
  );
}
EOF

cd ../../

########################################
# ROOT PACKAGE CONFIG
########################################
cat <<'EOF' > package.json
{
  "name": "commitdiary",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "build": "pnpm -r run build",
    "dev:web": "pnpm --filter @commitdiary/web-dashboard dev",
    "dev:ext": "pnpm --filter commitdiary-extension run build --watch"
  }
}
EOF

echo "✅ CommitDiary monorepo fully bootstrapped (core + extension + web-dashboard)."
