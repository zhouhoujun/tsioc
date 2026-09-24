export function buildGitSnapshotDiffLines(diff: Record<string, any>): string[] {
    const lines: string[] = [];
    const rawPatch = String(diff.rawPatch ?? diff.patch ?? '');
    if (rawPatch) {
        const parts = rawPatch.replace(/\r\n/g, '\n').split('\n');
        while (parts.length && parts[parts.length - 1] === '') {
            parts.pop();
        }
        lines.push(...parts);
        return lines;
    }
    const files = Array.isArray(diff.files) ? diff.files : [];
    for (const file of files) {
        const filePath = String(file?.filePath ?? file?.path ?? '?');
        lines.push(`diff --git a/${filePath} b/${filePath}`);
        const status = String(file?.status ?? '');
        if (status) {
            lines.push(`status: ${status}`);
        }
    }
    return lines;
}
