/** Slash commands are not stored in the prompt history. */
export function shouldSkipHistoryEntry(value: string): boolean {
    const text = String(value || '').trimStart();
    return !!text && text.startsWith('/');
}
