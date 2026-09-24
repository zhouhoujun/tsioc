export function decodeGlobalKey(raw: string): string {
    if (raw === '\u001b') return 'escape';
    if (raw === '\t') return 'tab';
    const arrows: Record<string, string> = {
        '\u001b[A': 'up',
        '\u001b[B': 'down',
        '\u001b[C': 'right',
        '\u001b[D': 'left'
    };
    const arrow = arrows[raw];
    if (arrow) return arrow;
    const navigation: Record<string, string> = {
        '\u001b[5~': 'pageup',
        '\u001b[6~': 'pagedown',
        '\u001b[H': 'home',
        '\u001b[F': 'end',
        '\u001b[1~': 'home',
        '\u001b[4~': 'end',
        '\u001b[7~': 'home',
        '\u001b[8~': 'end'
    };
    const navKey = navigation[raw];
    if (navKey) return navKey;
    const functionKeys: Record<string, string> = {
        '\u001b[12~': 'f2',
        '\u001bOQ': 'f2',
        '\u001b[1;2Q': 'shift+f2',
        '\u001b[1;12~': 'shift+f2'
    };
    const functionKey = functionKeys[raw];
    if (functionKey) return functionKey;
    const modifiedKeys: Record<string, string> = {
        '\u001b\u000b': 'ctrl+alt+k'
    };
    const modifiedKey = modifiedKeys[raw];
    if (modifiedKey) return modifiedKey;
    if (raw.length === 1) {
        const code = raw.charCodeAt(0);
        if (code >= 1 && code <= 26) return `ctrl+${String.fromCharCode(96 + code)}`;
        if (!/[\u0000-\u001f\u007f]/.test(raw)) {
            if (code >= 65 && code <= 90) return `shift+${raw.toLowerCase()}`;
            return raw.toLowerCase();
        }
    }
    return '';
}

export function resolveToolCallArgument(input: any): string {
    if (input === undefined || input === null) {
        return '';
    }
    let value = '';
    if (typeof input === 'string') {
        value = input;
    } else if (typeof input === 'object') {
        const preferred = [
            'path', 'file_path', 'filePath', 'file', 'filename', 'dir', 'directory', 'folder',
            'pattern', 'glob', 'query', 'q', 'command', 'cmd', 'prompt', 'target', 'url', 'name', 'id'
        ];
        for (const key of preferred) {
            const candidate = (input as Record<string, any>)[key];
            if (typeof candidate === 'string' && candidate.trim()) {
                value = candidate.trim();
                break;
            }
        }
        if (!value) {
            const first = Object.values(input as Record<string, any>)
                .find(candidate => typeof candidate === 'string' && candidate.trim());
            if (typeof first === 'string') {
                value = first.trim();
            }
        }
    }
    const collapsed = value.replace(/\s+/g, ' ').trim();
    return collapsed.length > 48 ? `${collapsed.slice(0, 47)}…` : collapsed;
}
