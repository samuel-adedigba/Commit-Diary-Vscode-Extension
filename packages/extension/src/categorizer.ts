
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

export type CommitAnalysis = {
  category: Category;
  enhancedMessage: string;
  originalMessage: string;
};

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

// Enhancement rules for transforming commit messages into more readable sentences
const ENHANCEMENT_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // Action words mapping
  { pattern: /^update\s+(.+)$/i, replacement: 'Made changes to $1' },
  { pattern: /^fix\s+(.+)$/i, replacement: 'Fixed $1' },
  { pattern: /^add\s+(.+)$/i, replacement: 'Added $1' },
  { pattern: /^create\s+(.+)$/i, replacement: 'Created $1' },
  { pattern: /^remove\s+(.+)$/i, replacement: 'Removed $1' },
  { pattern: /^delete\s+(.+)$/i, replacement: 'Deleted $1' },
  { pattern: /^implement\s+(.+)$/i, replacement: 'Implemented $1' },
  { pattern: /^refactor\s+(.+)$/i, replacement: 'Reorganized $1' },
  { pattern: /^improve\s+(.+)$/i, replacement: 'Improved $1' },
  { pattern: /^cleanup\s+(.+)$/i, replacement: 'Cleaned up $1' },

  // Technical term expansions
  { pattern: /\bapi\b/gi, replacement: 'API functionality' },
  { pattern: /\bdb\b/gi, replacement: 'database' },
  { pattern: /\bui\b/gi, replacement: 'user interface' },
  { pattern: /\bauth\b/gi, replacement: 'authentication' },
  { pattern: /\bconfig\b/gi, replacement: 'configuration' },
  { pattern: /\breadme\b/gi, replacement: 'documentation' },
  { pattern: /\breadme\.md\b/gi, replacement: 'documentation file' },

  // Verb expansions to complete sentences
  { pattern: /^(\w+)\s+seed/i, replacement: '$1 seed and export functionality' },
  { pattern: /^(\w+)\s+documentation/i, replacement: '$1 documentation files' },
  { pattern: /^(\w+)\s+first\s+push/i, replacement: '$1 my first push' },

  // General patterns
  { pattern: /^(\w+)\s+tests?/i, replacement: '$1 test cases' },
  { pattern: /^(\w+)\s+components?/i, replacement: '$1 components' },
  { pattern: /^(\w+)\s+styles?/i, replacement: '$1 styling' },
];

// Default enhancement for uncategorized messages
function enhanceMessage(message: string): string {
  const msg = message.trim();

  if (msg.length === 0) return msg;

  // Early exits for structural commits - return as-is with minimal enhancement
  if (/^merge\b/i.test(msg)) return 'Merged branch';
  if (/^revert\b/i.test(msg)) return 'Reverted previous changes';
  if (/^wip\b/i.test(msg)) return 'Work in progress';
  if (/^initial\s+/i.test(msg)) return 'Initial setup';

  // Apply enhancement rules
  let enhanced = msg;
  for (const rule of ENHANCEMENT_RULES) {
    const result = rule.pattern.exec(enhanced);
    if (result) {
      enhanced = enhanced.replace(rule.pattern, rule.replacement);
      break; // Apply only first matching rule
    }
  }

  // Capitalize first letter and ensure it's a complete sentence
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);

  // Add period if it doesn't end with punctuation
  if (!/[.!?]$/.test(enhanced)) {
    enhanced += '';
  }

  // If no enhancement was applied and it's very short, add "Made" prefix
  if (enhanced.toLowerCase() === msg.toLowerCase() && msg.split(' ').length <= 3) {
    enhanced = 'Made ' + enhanced.toLowerCase();
    enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  }

  return enhanced || msg;
}

// Test function to demonstrate enhancement examples (can be removed in production)
export function testEnhancements() {
  const testMessages = [
    "update seed and export",
    "fix bug",
    "add tests",
    "create component",
    "update ui components",
    "dev mode first push"
  ];

  console.log("🔧 Commit Message Enhancements:");
  testMessages.forEach(msg => {
    const analysis = categorizeCommit(msg);
    console.log(`"${analysis.originalMessage}" → "${analysis.enhancedMessage}" [${analysis.category}]`);
  });
}

export function categorizeCommit(message: string): CommitAnalysis {
  const msg = (message || '').trim();
  const enhanced = enhanceMessage(msg);

  if (msg.length === 0) {
    return {
      category: 'Other',
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }

  // Early exits for structural commits
  if (/^merge\b/i.test(msg)) {
    return {
      category: 'Merge',
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }
  if (/^revert\b/i.test(msg)) {
    return {
      category: 'Revert',
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }
  if (/^wip\b/i.test(msg)) {
    return {
      category: 'Chore',
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }

  // Conventional Commit at start
  const start = START_TYPE.exec(msg);
  if (start?.groups?.type) {
    let category: Category = 'Other';
    switch (start.groups.type.toLowerCase()) {
      case 'feat': category = 'Feature'; break;
      case 'fix': category = 'Fix'; break;
      case 'refactor': category = 'Refactor'; break;
      case 'docs': case 'doc': category = 'Docs'; break;
      case 'test': category = 'Test'; break;
      case 'chore': category = 'Chore'; break;
      case 'build': category = 'Build'; break;
      case 'ci': category = 'CI'; break;
      case 'perf': category = 'Perf'; break;
      case 'style': category = 'Style'; break;
      case 'revert': category = 'Revert'; break;
      case 'merge': category = 'Merge'; break;
    }
    return {
      category,
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }

  // Emoji hints
  for (const rule of EMOJI_HINTS) {
    if (rule.re.test(msg)) {
      return {
        category: rule.cat,
        enhancedMessage: enhanced,
        originalMessage: msg
      };
    }
  }

  // Loose keyword rules
  for (const rule of LOOSE_RULES) {
    if (rule.re.test(msg)) {
      return {
        category: rule.cat,
        enhancedMessage: enhanced,
        originalMessage: msg
      };
    }
  }

  return {
    category: 'Other',
    enhancedMessage: enhanced,
    originalMessage: msg
  };
}
