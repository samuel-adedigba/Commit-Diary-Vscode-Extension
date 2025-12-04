import type { Commit } from "./parser";

export function groupByPeriod(commits: Commit[], period: "daily"|"weekly"|"monthly"|"yearly") {
  const grouped: Record<string, Commit[]> = {};
  for (const c of commits) {
    const date = new Date(c.date);
    let key: string;
    switch (period) {
      case "daily":
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        break;
      case "weekly":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        key = weekStart.toISOString().slice(0, 10);
        break;
      case "monthly":
        key = date.toISOString().slice(0, 7); // YYYY-MM
        break;
      case "yearly":
        key = date.getFullYear().toString(); // YYYY
        break;
      default:
        key = date.toISOString().slice(0, 10);
    }
    if (!grouped[key]) grouped[key] = [];
    grouped[key]?.push(c);
  }
  return grouped;
}
