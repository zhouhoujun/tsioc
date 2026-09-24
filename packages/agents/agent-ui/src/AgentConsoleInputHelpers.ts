export function parseSlashCommandLine(input: string): { raw: string; command: string; args: string } {
    const raw = String(input || '').trim();
    if (!raw.startsWith('/')) {
        return { raw, command: raw, args: '' };
    }
    const firstSpace = raw.indexOf(' ');
    if (firstSpace < 0) {
        return { raw, command: raw, args: '' };
    }
    return {
        raw,
        command: raw.slice(0, firstSpace),
        args: raw.slice(firstSpace + 1).trim()
    };
}
