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

export async function handleMenuSelection(state: any, handleCommand: (value: string) => Promise<any>, value: string): Promise<void> {
    const selected = String(value || '').trim();
    if (!selected) {
        return;
    }
    const currentInput = String(state.input || '').trim();
    if (currentInput === '/help') {
        state.setInput('');
    }
    if (selected.startsWith('/')) {
        await handleCommand(selected);
        return;
    }
    if (selected.startsWith('@')) {
        const base = String(state.input || '').trim();
        const nextInput = base
            ? `${base} ${selected} `
            : `${selected} `;
        state.setInput(nextInput, state.clampCursor(nextInput, nextInput.length));
        state.setInputFocused(true);
    }
}
