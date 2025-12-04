export interface Commit {
  date: string;
  message: string;
  author: string;
}

export function parseGitLog(log: string): Commit[] {
  const lines = log.split("\n").filter(Boolean);
  return lines.map(line => {
    const [date, author, ...messageParts] = line.split("|");
    return {
      date: date ?? "",
      author: author ?? "Unknown",
      message: messageParts.join("|").trim(),
    };
  });
}
