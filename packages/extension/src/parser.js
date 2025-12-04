"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitLog = parseGitLog;
function parseGitLog(log) {
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
//# sourceMappingURL=parser.js.map