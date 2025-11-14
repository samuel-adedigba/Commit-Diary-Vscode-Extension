
// export function categorizeCommit(msg: string) {
//   const lowerMsg = msg.toLowerCase();
//   if (/^feat:/i.test(msg) || /feat|feature|add/.test(lowerMsg)) return "Feature";
//   if (/^fix:/i.test(msg) || /fix|bug|resolve/.test(lowerMsg)) return "Fix";
//   if (/^refactor:/i.test(msg) || /refactor/.test(lowerMsg)) return "Refactor";
//   if (/^docs:/i.test(msg) || /docs?|readme|md|document/.test(lowerMsg)) return "Docs";
//   if (/^test:/i.test(msg) || /test|spec/.test(lowerMsg)) return "Test";
//   return "Other";
// }
export type Category =
  | 'Feature'
  | 'Fix'
  | 'Refactor'
  | 'Docs'
  | 'Test'
  | 'Chore'
  | 'Build'
  | 'CI'
  | 'Perf'
  | 'Style'
  | 'Merge'
  | 'Revert'
  | 'Other';

const START_TYPE = /^(?<type>feat|fix|refactor|docs?|test|chore|build|ci|perf|style|revert|merge)(?:\(|:)\s*/i;

const EMOJI_HINTS: Array<{ re: RegExp; cat: Category }> = [
  { re: /✨|:sparkles:/, cat: 'Feature' },
  { re: /🐛|:bug:/, cat: 'Fix' },
  { re: /♻️|:recycle:/, cat: 'Refactor' },
  { re: /📝|:memo:/, cat: 'Docs' },
  { re: /✅|:white_check_mark:/, cat: 'Test' },
  { re: /🚀|:rocket:/, cat: 'Perf' },
  { re: /🎨|:art:/, cat: 'Style' },
  { re: /🔧|:wrench:/, cat: 'Chore' },
];

const LOOSE_RULES: Array<{ re: RegExp; cat: Category }> = [
  // Feature
  { re: /\b(feature|features|implement(ed|ing)?|introduc(e|ed|ing)|add(s|ed|ing)?|create(d)?)\b/i, cat: 'Feature' },
  // Fix
  { re: /\b(fix|fixes|fixed|bug|bugs|hotfix|hot-fix|resolve(d|s)?)\b/i, cat: 'Fix' },
  // Refactor
  { re: /\brefactor(ed|ing)?\b/i, cat: 'Refactor' },
  // Docs (avoid too-broad "md"; match doc, docs, readme, changelog)
  { re: /\b(doc|docs|document(ation)?|readme|changelog|guide|manual)\b/i, cat: 'Docs' },
  // Test
  { re: /\b(test|tests|unit|e2e|spec|specs|integration)\b/i, cat: 'Test' },
  // Perf
  { re: /\b(perf(ormance)?|optimi[sz]e(d|s|r)?|speed|throughput|latency)\b/i, cat: 'Perf' },
  // Style
  { re: /\b(style|format|prettier|eslint[- ]?(fix)?|lint(ing)?)\b/i, cat: 'Style' },
  // Build
  { re: /\b(build|builds|bundl(e|er)|webpack|vite|rollup|esbuild)\b/i, cat: 'Build' },
  // CI
  { re: /\b(ci|cd|pipeline|workflow|github actions|gitlab ci|circleci)\b/i, cat: 'CI' },
  // Chore
  { re: /\b(chore|bump|upgrade|update|deps?|dependency|housekeep(ing)?)\b/i, cat: 'Chore' },
];

export function categorizeCommit(message: string): Category {
  const msg = (message || '').trim();

  if (msg.length === 0) return 'Other';

  // Early exits for structural commits
  if (/^merge\b/i.test(msg)) return 'Merge';
  if (/^revert\b/i.test(msg)) return 'Revert';
  if (/^wip\b/i.test(msg)) return 'Chore';

  // Conventional Commit at start
  const start = START_TYPE.exec(msg);
  if (start?.groups?.type) {
    switch (start.groups.type.toLowerCase()) {
      case 'feat': return 'Feature';
      case 'fix': return 'Fix';
      case 'refactor': return 'Refactor';
      case 'docs': case 'doc': return 'Docs';
      case 'test': return 'Test';
      case 'chore': return 'Chore';
      case 'build': return 'Build';
      case 'ci': return 'CI';
      case 'perf': return 'Perf';
      case 'style': return 'Style';
      case 'revert': return 'Revert';
      case 'merge': return 'Merge';
    }
  }

  // Emoji hints
  for (const rule of EMOJI_HINTS) {
    if (rule.re.test(msg)) return rule.cat;
  }

  // Loose keyword rules
  for (const rule of LOOSE_RULES) {
    if (rule.re.test(msg)) return rule.cat;
  }

  return 'Other';
}