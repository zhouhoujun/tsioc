/** Pure CSV/XML/HTML helpers used by the parser node handlers. */
export function parseCsv(text: string, delimiter: string, header: boolean): any {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    const source = String(text ?? '');
    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        if (quoted) {
            if (char === '"') {
                if (source[index + 1] === '"') {
                    cell += '"';
                    index++;
                } else {
                    quoted = false;
                }
            } else {
                cell += char;
            }
        } else if (char === '"') {
            quoted = true;
        } else if (char === delimiter) {
            row.push(cell);
            cell = '';
        } else if (char === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else if (char !== '\r') {
            cell += char;
        }
    }
    if (cell || row.length) {
        row.push(cell);
        rows.push(row);
    }
    if (!header || !rows.length) {
        return rows;
    }
    const keys = rows[0];
    return rows.slice(1).map(values => {
        const item: Record<string, string> = {};
        keys.forEach((key, index) => {
            item[key] = values[index] ?? '';
        });
        return item;
    });
}

export function stringifyCsv(value: any, delimiter: string, header = true): string {
    const rows: any[][] = Array.isArray(value) ? value : [];
    if (!rows.length) {
        return '';
    }
    const escape = (cell: any) => {
        const text = cell === undefined || cell === null ? '' : String(cell);
        return /["\n\r]/.test(text) || text.includes(delimiter)
            ? `"${text.replace(/"/g, '""')}"`
            : text;
    };
    if (!Array.isArray(rows[0])) {
        const headers = Object.keys(rows[0] || {});
        const body = rows.map(row => headers.map(key => escape((row as any)?.[key])).join(delimiter));
        return (header ? [headers.map(escape).join(delimiter), ...body] : body).join('\n');
    }
    return rows.map(row => row.map(escape).join(delimiter)).join('\n');
}




export function decodeXmlEntities(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

export function parseXmlDocument(text: string): any {
    const root: any = {};
    const stack: any[] = [root];
    const tagPattern = /<([^>]+)>/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(text))) {
        const between = text.slice(lastIndex, match.index).trim();
        if (between) {
            const current = stack[stack.length - 1];
            current['#text'] = current['#text']
                ? `${current['#text']} ${decodeXmlEntities(between)}`
                : decodeXmlEntities(between);
        }
        let tag = match[1].trim();
        lastIndex = tagPattern.lastIndex;
        if (tag.startsWith('?') || tag.startsWith('!')) {
            continue;
        }
        if (tag.startsWith('/')) {
            if (stack.length > 1) {
                stack.pop();
            }
            continue;
        }
        const selfClosing = tag.endsWith('/');
        if (selfClosing) {
            tag = tag.slice(0, -1).trim();
        }
        const name = (tag.match(/^([^\s/]+)/) || [])[1] || tag;
        const attrs: Record<string, string> = {};
        const attrPattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
        let attr: RegExpExecArray | null;
        while ((attr = attrPattern.exec(tag))) {
            attrs[attr[1]] = decodeXmlEntities(attr[2] ?? attr[3] ?? '');
        }
        const node: any = Object.keys(attrs).length ? { '@attrs': attrs } : {};
        const parent = stack[stack.length - 1];
        if (parent[name] === undefined) {
            parent[name] = node;
        } else if (Array.isArray(parent[name])) {
            parent[name].push(node);
        } else {
            parent[name] = [parent[name], node];
        }
        if (!selfClosing) {
            stack.push(node);
        }
    }
    return root;
}

export function serializeXmlValue(name: string, value: any, pretty: boolean, depth = 0): string {
    const indent = pretty ? '  '.repeat(depth) : '';
    const newline = pretty ? '\n' : '';
    if (Array.isArray(value)) {
        return value.map(item => serializeXmlValue(name, item, pretty, depth)).join(newline);
    }
    if (value === null || value === undefined || typeof value !== 'object') {
        return `${indent}<${name}>${String(value ?? '')}</${name}>${newline}`;
    }
    const attrs = value['@attrs'] as Record<string, string> | undefined;
    const attrText = attrs
        ? Object.entries(attrs).map(([key, val]) => ` ${key}="${String(val).replace(/"/g, '&quot;')}"`).join('')
        : '';
    const text = value['#text'] === undefined ? '' : String(value['#text']);
    const children = Object.entries(value)
        .filter(([key]) => key !== '@attrs' && key !== '#text')
        .map(([key, child]) => serializeXmlValue(key, child, pretty, depth + 1))
        .join('');
    if (!text && !children) {
        return `${indent}<${name}${attrText}/>${newline}`;
    }
    return `${indent}<${name}${attrText}>${newline}${children}${text ? indent + (pretty ? '  ' : '') + text + newline : ''}${indent}</${name}>${newline}`;
}

export function pruneXmlValue(value: any, attributes: boolean, text: boolean): any {
    if (Array.isArray(value)) {
        return value.map(item => pruneXmlValue(item, attributes, text));
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    const next: Record<string, any> = {};
    Object.entries(value).forEach(([key, child]) => {
        if (key === '@attrs' && !attributes) {
            return;
        }
        if (key === '#text' && !text) {
            return;
        }
        next[key] = pruneXmlValue(child, attributes, text);
    });
    return next;
}

export function htmlAttributes(text: string, attribute: string): string[] {
    const values: string[] = [];
    const pattern = new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
        const value = decodeXmlEntities(match[1] ?? match[2] ?? '');
        if (value && !values.includes(value)) {
            values.push(value);
        }
    }
    return values;
}

export function stripHtml(text: string): string {
    return decodeXmlEntities(
        text
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    );
}

export function htmlLinks(text: string): string[] {
    const links: string[] = [];
    const pattern = /(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
        const value = decodeXmlEntities(match[1] ?? match[2] ?? '');
        if (value && !links.includes(value)) {
            links.push(value);
        }
    }
    return links;
}
