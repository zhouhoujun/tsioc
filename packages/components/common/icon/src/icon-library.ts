import { IconDefinition, IconPath } from './icon.types';

/**
 * Shared icon library.
 *
 * Every icon is defined once in the renderer-neutral `0 0 16 16` vector space
 * and also carries a glyph fallback for text-only renderers. Hosts reference an
 * icon by name (`<icon name="run"></icon>`); the glyph fallback is an
 * implementation detail so terminal hosts keep a sensible label.
 *
 * The set covers the workflow designer/admin chrome plus the built-in workflow
 * node types, which makes the same library reusable by any product shell.
 */
export const ICON_LIBRARY: Record<string, IconDefinition> = {
    /* ---------------------------------------------------------------------
     * Toolbar and menu actions
     * ------------------------------------------------------------------ */
    run: {
        glyph: '▶',
        filled: true,
        paths: ['M4.8 3.2 12.2 8l-7.4 4.8z']
    },
    schedule: {
        glyph: '⏱',
        paths: [
            'M8 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z',
            'M8 4.8V8l2.2 1.3'
        ]
    },
    resume: {
        glyph: '↻',
        paths: [
            'M12.5 8a4.5 4.5 0 1 1-1.4-3.2',
            'M12.5 2.8v3h-3'
        ]
    },
    stop: {
        glyph: '■',
        filled: true,
        paths: ['M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z']
    },
    undo: {
        glyph: '↶',
        paths: [
            'M3.2 6.5h6.1a3.4 3.4 0 0 1 0 6.8H7.2',
            'm5.8 3.6-2.8 2.9 2.8 2.9'
        ]
    },
    redo: {
        glyph: '↷',
        paths: [
            'M12.8 6.5H6.7a3.4 3.4 0 0 0 0 6.8h2.1',
            'm10.2 3.6 2.8 2.9-2.8 2.9'
        ]
    },
    delete: {
        glyph: '✕',
        paths: ['m4.2 4.2 7.6 7.6M11.8 4.2l-7.6 7.6']
    },
    close: {
        glyph: '✕',
        paths: ['m4.2 4.2 7.6 7.6M11.8 4.2l-7.6 7.6']
    },
    minus: {
        glyph: '−',
        paths: ['M3.5 8h9']
    },
    plus: {
        glyph: '+',
        paths: ['M3.5 8h9M8 3.5v9']
    },
    fit: {
        glyph: '⤢',
        paths: ['M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3']
    },
    layout: {
        glyph: '▦',
        strokeWidth: 1.4,
        paths: [
            'M3.3 2.5h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8V3.3a.8.8 0 0 1 .8-.8z',
            'M9.3 2.5h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H9.3a.8.8 0 0 1-.8-.8V3.3a.8.8 0 0 1 .8-.8z',
            'M3.3 8.5h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8V9.3a.8.8 0 0 1 .8-.8z',
            'M9.3 8.5h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H9.3a.8.8 0 0 1-.8-.8V9.3a.8.8 0 0 1 .8-.8z'
        ]
    },
    duplicate: {
        glyph: '❐',
        strokeWidth: 1.4,
        paths: [
            'M4 2.5h6.5A1.5 1.5 0 0 1 12 4v6.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5z',
            'M6 5.5h6.5A1.5 1.5 0 0 1 14 7v6.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 6 5.5z'
        ]
    },
    logs: {
        glyph: '☰',
        paths: ['M3 4.5h10M3 8h10M3 11.5h7']
    },
    config: {
        glyph: '⚙',
        paths: [
            'M3 5h10M3 11h10',
            'M6.2 3.2v3.6','M9.8 9.2v3.6'
        ]
    },
    save: {
        glyph: '⇩',
        paths: [
            'M8 2.8v7.4M4.8 7.2 8 10.4l3.2-3.2',
            'M3 12.8h10'
        ]
    },
    publish: {
        glyph: '↑',
        paths: [
            'M8 10.6V3.2M4.8 6.4 8 3.2l3.2 3.2',
            'M3 12.8h10'
        ]
    },
    library: {
        glyph: '▤',
        strokeWidth: 1.4,
        paths: [
            'M3 3h2.6v10H3z',
            'M6.7 3h2.6v10H6.7z',
            'M10.4 3H13v10h-2.6z'
        ]
    },
    json: {
        glyph: '{}',
        paths: ['M6.2 3.2c-1.7 0-2 .8-2 2.3v1.2c0 .8-.5 1.3-1.2 1.3.7 0 1.2.5 1.2 1.3v1.2c0 1.5.3 2.3 2 2.3M9.8 3.2c1.7 0 2 .8 2 2.3v1.2c0 .8.5 1.3 1.2 1.3-.7 0-1.2.5-1.2 1.3v1.2c0 1.5-.3 2.3-2 2.3']
    },
    clear: {
        glyph: '⌫',
        paths: [
            'M3 4.5h10M6.5 4.5V3h3v1.5',
            'M4.6 4.5l.6 8.2h5.6l.6-8.2'
        ]
    },
    rename: {
        glyph: '✎',
        paths: [
            'm3.2 12.8 1-3.2 6.5-6.5 2.2 2.2-6.5 6.5z',
            'm9.6 4.2 2.2 2.2'
        ]
    },
    theme: {
        glyph: '◐',
        paths: [
            'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
            { d: 'M8 2.5a5.5 5.5 0 0 1 0 11z', filled: true }
        ]
    },
    language: {
        glyph: '文',
        paths: [
            'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
            'M8 2.5c2.5 2.5 2.5 8.5 0 11M8 2.5c-2.5 2.5-2.5 8.5 0 11M2.7 8h10.6'
        ]
    },
    menu: {
        glyph: '☰',
        paths: ['M3 4.5h10M3 8h10M3 11.5h10']
    },
    'caret-down': {
        glyph: '▾',
        filled: true,
        paths: ['M4.2 6.4 8 10.2l3.8-3.8z']
    },
    'caret-right': {
        glyph: '▸',
        filled: true,
        paths: ['M6.4 4.2 10.2 8l-3.8 3.8z']
    },
    check: {
        glyph: '✓',
        paths: ['M3.4 8.4 6.4 11.4 12.6 4.6']
    },
    refresh: {
        glyph: '↻',
        paths: [
            'M12.5 8a4.5 4.5 0 1 1-1.4-3.2',
            'M12.5 2.8v3h-3'
        ]
    },
    history: {
        glyph: '◷',
        paths: [
            'M3.4 8.6a4.8 4.8 0 1 1 1 2.6',
            'M3.4 8.6 2.6 6.2M3.4 8.6l2.4-.7',
            'M8 5.2V8l2.1 1.3'
        ]
    },
    import: {
        glyph: '⇣',
        paths: [
            'M8 2.8v6.4M5.2 6.4 8 9.2l2.8-2.8',
            'M3.2 11.2v1.6h9.6v-1.6'
        ]
    },
    export: {
        glyph: '⇡',
        paths: [
            'M8 9.2V2.8M5.2 5.6 8 2.8l2.8 2.8',
            'M3.2 11.2v1.6h9.6v-1.6'
        ]
    },
    eye: {
        glyph: '◎',
        paths: [
            'M1.8 8S4.2 4.2 8 4.2 14.2 8 14.2 8 11.8 11.8 8 11.8 1.8 8 1.8 8z',
            'M8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z'
        ]
    },
    'arrow-up': {
        glyph: '↑',
        paths: ['M8 12.8V3.2M4.6 6.6 8 3.2l3.4 3.4']
    },
    'arrow-down': {
        glyph: '↓',
        paths: ['M8 3.2v9.6M4.6 9.4 8 12.8l3.4-3.4']
    },
    login: {
        glyph: '→',
        paths: [
            'M9.8 3.2h3v9.6h-3',
            'M3.2 8h7M7.4 5.2 10.2 8l-2.8 2.8'
        ]
    },

    /* ---------------------------------------------------------------------
     * Workflow node types
     * ------------------------------------------------------------------ */
    start: {
        glyph: '▶',
        filled: true,
        paths: ['M4.8 3.2 12.2 8l-7.4 4.8z']
    },
    end: {
        glyph: '■',
        filled: true,
        paths: ['M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z']
    },
    inject: {
        glyph: '⚡',
        filled: true,
        paths: ['M9.2 2.2 4 9h3.2l-.8 4.8L12 7H8.8z']
    },
    task: {
        glyph: '⚙',
        paths: [
            'M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',
            'M8 2.5v2M8 11.5v2M2.5 8h2M11.5 8h2M4.1 4.1l1.4 1.4M10.5 10.5l1.4 1.4M11.9 4.1l-1.4 1.4M5.5 10.5l-1.4 1.4'
        ]
    },
    function: {
        glyph: 'ƒ',
        paths: [
            'M9.8 3c-1.5-.6-3 .4-3.4 2L5.2 13',
            'M4 6.5h4.2'
        ]
    },
    condition: {
        glyph: '?',
        paths: [
            'M6 6.1a2 2 0 1 1 2.8 1.9c-.6.3-1 .9-1 1.6',
            { d: 'M8 10.9a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z', filled: true }
        ]
    },
    switch: {
        glyph: '⇉',
        paths: [
            'M2.8 4h3.4l4.2 8h2.8',
            'M2.8 12h3.4l4.2-8h2.8',
            'M11.2 2.2 13.6 4l-2.4 1.8',
            'M11.2 10.2 13.6 12l-2.4 1.8'
        ]
    },
    junction: {
        glyph: '•',
        filled: true,
        paths: ['M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z']
    },
    sequence: {
        glyph: '≡',
        paths: ['M3 4.5h10M3 8h10M3 11.5h7']
    },
    parallel: {
        glyph: '⑂',
        paths: [
            'M3 8h3.5M6.5 8l3-3.5h3M6.5 8l3 3.5h3'
        ]
    },
    join: {
        glyph: '⊙',
        paths: [
            'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
            { d: 'M8 6.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z', filled: true }
        ]
    },
    loop: {
        glyph: '↻',
        paths: [
            'M12.5 8a4.5 4.5 0 1 1-1.4-3.2',
            'M12.5 2.8v3h-3'
        ]
    },
    trigger: {
        glyph: '◷',
        paths: [
            'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
            'M8 5v3.2l2.2 1.4'
        ]
    },
    delay: {
        glyph: '⏱',
        paths: [
            'M5 2.8h6M5 13.2h6',
            'M5.5 2.8c0 2.5 2.5 3.2 2.5 5s-2.5 2.5-2.5 5M10.5 2.8c0 2.5-2.5 3.2-2.5 5s2.5 2.5 2.5 5'
        ]
    },
    log: {
        glyph: '✎',
        paths: [
            'm3.2 12.8 1-3.2 6.5-6.5 2.2 2.2-6.5 6.5z',
            'm9.6 4.2 2.2 2.2'
        ]
    },
    debug: {
        glyph: '◉',
        paths: [
            'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
            { d: 'M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', filled: true }
        ]
    },
    'http-request': {
        glyph: '⇄',
        paths: [
            'M3 5.5h9M9.5 3.2 12 5.5 9.5 7.8',
            'M13 10.5H4M6.5 8.2 4 10.5l2.5 2.3'
        ]
    },
    assign: {
        glyph: '＝',
        paths: ['M3.5 5.8h9M3.5 10.2h9']
    },
    transform: {
        glyph: '⇢',
        paths: ['M2.5 8h9M9.2 5.2 12 8l-2.8 2.8']
    },
    template: {
        glyph: 'T',
        paths: ['M3.5 4h9M8 4v8.5']
    },
    csv: {
        glyph: '⋮',
        paths: [
            'M2.8 3.2h10.4v9.6H2.8z',
            'M2.8 6.4h10.4M2.8 9.6h10.4',
            'M6.3 3.2v9.6M9.7 3.2v9.6'
        ]
    },
    change: {
        glyph: '✎',
        paths: [
            'm3.2 12.8 1-3.2 6.5-6.5 2.2 2.2-6.5 6.5z',
            'm9.6 4.2 2.2 2.2'
        ]
    },
    statistics: {
        glyph: 'Σ',
        paths: ['M11.6 3.5H4.4l3.5 4.5-3.5 4.5h7.2']
    },
    merge: {
        glyph: '⊕',
        paths: [
            'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
            'M8 5.4v5.2M5.4 8h5.2'
        ]
    },
    'event-emit': {
        glyph: '⇡',
        paths: [
            'M8 11V3.5M5.2 6.3 8 3.5l2.8 2.8',
            'M3 12.5h10'
        ]
    },
    'event-wait': {
        glyph: '⇣',
        paths: [
            'M8 3.5V11M5.2 8.2 8 11l2.8-2.8',
            'M3 12.5h10'
        ]
    },
    command: {
        glyph: '>_',
        paths: ['M3.2 4.5 6.5 8l-3.3 3.5M8 12h4.8']
    },
    split: {
        glyph: '✂',
        paths: [
            'M6.6 5.2a1.9 1.9 0 1 0-2.6 2.7 1.9 1.9 0 0 0 2.6-2.7z',
            'M6.6 10.8a1.9 1.9 0 1 0-2.6-2.7 1.9 1.9 0 0 0 2.6 2.7z',
            'M6.4 6.9 12.8 12M6.4 9.1 12.8 4'
        ]
    },
    map: {
        glyph: '⇉',
        paths: [
            'M2.8 4h3.4l4.2 8h2.8',
            'M2.8 12h3.4l4.2-8h2.8',
            'M11.2 2.2 13.6 4l-2.4 1.8',
            'M11.2 10.2 13.6 12l-2.4 1.8'
        ]
    },
    filter: {
        glyph: '▽',
        paths: ['M3 3.5h10L9.2 8.5v4L6.8 11V8.5z']
    },
    sort: {
        glyph: '⇅',
        paths: [
            'M5 12.5v-9M2.8 5.7 5 3.5l2.2 2.2',
            'M11 3.5v9M8.8 10.3 11 12.5l2.2-2.2'
        ]
    },
    range: {
        glyph: '↔',
        paths: [
            'M3 8h10',
            'M5.2 5.8 3 8l2.2 2.2M10.8 5.8 13 8l-2.2 2.2'
        ]
    },
    batch: {
        glyph: '▦',
        strokeWidth: 1.4,
        paths: [
            'M3.3 2.5h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8V3.3a.8.8 0 0 1 .8-.8z',
            'M9.3 2.5h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H9.3a.8.8 0 0 1-.8-.8V3.3a.8.8 0 0 1 .8-.8z',
            'M3.3 8.5h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8V9.3a.8.8 0 0 1 .8-.8z',
            'M9.3 8.5h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H9.3a.8.8 0 0 1-.8-.8V9.3a.8.8 0 0 1 .8-.8z'
        ]
    },
    trycatch: {
        glyph: '⚠',
        paths: [
            'M8 2.8 13.5 12.8h-11z',
            'M8 6.5v3.2',
            { d: 'M8 10.9a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z', filled: true }
        ]
    },
    subprocess: {
        glyph: '⧉',
        strokeWidth: 1.4,
        paths: [
            'M4 2.5h6.5A1.5 1.5 0 0 1 12 4v6.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5z',
            'M6 5.5h6.5A1.5 1.5 0 0 1 14 7v6.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 6 5.5z'
        ]
    },
    comment: {
        glyph: '🗒',
        paths: [
            'M3.2 2.8h6.2l3.4 3.4v7H3.2z',
            'M9.4 2.8v3.4h3.4',
            'M5.4 8h5.2M5.4 10.4h5.2'
        ]
    },
    custom: {
        glyph: '◆',
        paths: ['M8 2.5 13.5 8 8 13.5 2.5 8z']
    }
};

/** Every registered icon name. */
export const ICON_NAMES: string[] = Object.keys(ICON_LIBRARY);

const ICON_BY_GLYPH: Map<string, IconDefinition> = (() => {
    const map = new Map<string, IconDefinition>();
    ICON_NAMES.forEach(name => {
        const definition = ICON_LIBRARY[name];
        if (!map.has(definition.glyph)) {
            map.set(definition.glyph, definition);
        }
    });
    return map;
})();

/** Look up an icon by name. */
export function getIcon(name: string | undefined | null): IconDefinition | undefined {
    if (!name) {
        return undefined;
    }
    return ICON_LIBRARY[name];
}

/**
 * Resolve the definition for a name, falling back to a glyph match so hosts can
 * keep passing legacy glyph strings (for example plugin-defined node icons).
 */
export function resolveIcon(name?: string | null, glyph?: string | null): IconDefinition | undefined {
    const named = getIcon(name);
    if (named) {
        return named;
    }
    const candidate = glyph || name;
    if (!candidate) {
        return undefined;
    }
    return ICON_BY_GLYPH.get(candidate);
}

/** Whether the library contains the given icon name. */
export function hasIcon(name: string | undefined | null): boolean {
    return !!name && Object.prototype.hasOwnProperty.call(ICON_LIBRARY, name);
}


/**
 * Build renderer attributes for every path of an icon. Filled paths use
 * `fill="currentColor"`; outlined paths share the same stroke settings so all
 * icons keep a uniform visual weight.
 */
export function iconPathAttributes(
    name?: string | null,
    glyph?: string | null,
    strokeWidth?: number | string
): Array<Record<string, string>> {
    const definition = resolveIcon(name, glyph);
    const paths = definition?.paths || [];
    if (!paths.length) {
        return [];
    }
    const override = strokeWidth == null || strokeWidth === '' ? undefined : Number(strokeWidth);
    const width = String(
        override != null && Number.isFinite(override) && override > 0
            ? override
            : definition?.strokeWidth ?? 1.6
    );
    return paths.map(path => pathAttributesOf(path, definition?.filled === true, width));
}

/** Glyph fallback for an icon: the library glyph, then the supplied glyph/name. */
export function iconGlyphText(name?: string | null, glyph?: string | null): string {
    return resolveIcon(name, glyph)?.glyph || glyph || name || '';
}

function pathAttributesOf(path: string | IconPath, filled: boolean, strokeWidth: string): Record<string, string> {
    const data = typeof path === 'string' ? path : path.d;
    const useFill = typeof path === 'string' ? filled : path.filled ?? filled;
    if (useFill) {
        return { d: data, fill: 'currentColor', stroke: 'none' };
    }
    return {
        d: data,
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': strokeWidth,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
    };
}
