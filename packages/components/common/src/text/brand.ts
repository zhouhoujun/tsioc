export function buildBrandBlock(width: number, appTitle = 'TSDI Agent', model = '', workspace = '', version = ''): string[] {
    const title = version ? `${appTitle.toUpperCase()} v${version}` : appTitle.toUpperCase();
    const meta = [String(model || '').trim(), String(workspace || '').trim()].filter(Boolean).join(' · ');
    const innerWidth = Math.max(8, Math.min(Math.max(8, Math.floor(width) - 2), Math.max(title.length, meta.length, 8)));
    const fit = (value: string, centered = false): string => {
        const clipped = value.slice(0, innerWidth);
        const remaining = Math.max(0, innerWidth - clipped.length);
        const left = centered ? Math.floor(remaining / 2) : 0;
        return `│${' '.repeat(left)}${clipped}${' '.repeat(remaining - left)}│`;
    };
    return [`╭${'─'.repeat(innerWidth)}╮`, fit(title, true), fit(meta), `╰${'─'.repeat(innerWidth)}╯`];
}
