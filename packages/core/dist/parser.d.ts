export interface Commit {
    date: string;
    message: string;
    author: string;
}
export declare function parseGitLog(log: string): Commit[];
//# sourceMappingURL=parser.d.ts.map