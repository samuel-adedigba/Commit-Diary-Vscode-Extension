"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorizeCommit = categorizeCommit;
function categorizeCommit(msg) {
    if (/^feat:/i.test(msg))
        return "Feature";
    if (/^fix:/i.test(msg))
        return "Fix";
    if (/^refactor:/i.test(msg))
        return "Refactor";
    if (/^docs:/i.test(msg))
        return "Docs";
    if (/^test:/i.test(msg))
        return "Test";
    return "Other";
}
