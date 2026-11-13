/**
 * Minimal YAML subset used by the workflow `yaml` node.
 *
 * Supports mappings, nested blocks, lists, quoted/plain scalars, numbers,
 * booleans, null, inline JSON and comments. It intentionally stays dependency
 * free and predictable for workflow configuration snippets.
 */
function parseScalar(text: string): any {
    const value = text.trim();
    if (!value) {
        return null;
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    if (value === 'null' || value === '~') {
        return null;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    if (/^-?\d+(\.\d+)?$/.test(value)) {
        return Number(value);
    }
    if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
}

export function parseYaml(text: string): any {
    const source = String(text ?? '').replace(/\r\n/g, '\n');
    const trimmed = source.trim();
    if (!trimmed) {
        return null;
    }
    try {
        return JSON.parse(trimmed);
    } catch {
        // Fall back to the line-based YAML subset.
    }
    const lines = source
        .split('\n')
        .map(line => ({ raw: line, indent: line.match(/^\s*/)?.[0].length || 0, text: line.trim() }))
        .filter(line => line.text && !line.text.startsWith('#'));
    let index = 0;

    const parseBlock = (indent: number): any => {
        if (index >= lines.length || lines[index].indent < indent) {
            return null;
        }
        const isList = lines[index].text.startsWith('- ');
        if (isList) {
            const list: any[] = [];
            while (index < lines.length && lines[index].indent === indent && lines[index].text.startsWith('- ')) {
                const rest = lines[index].text.slice(2).trim();
                index += 1;
                if (!rest) {
                    list.push(parseBlock(lines[index]?.indent ?? indent + 2));
                    continue;
                }
                const colon = rest.indexOf(':');
                if (colon > 0 && !/^["']/.test(rest)) {
                    const item: Record<string, any> = {};
                    const key = rest.slice(0, colon).trim();
                    const value = rest.slice(colon + 1).trim();
                    item[key] = value ? parseScalar(value) : parseBlock(lines[index]?.indent ?? indent + 2);
                    while (index < lines.length && lines[index].indent > indent && !lines[index].text.startsWith('- ')) {
                        const line = lines[index].text;
                        const split = line.indexOf(':');
                        if (split < 0) {
                            index += 1;
                            continue;
                        }
                        const childKey = line.slice(0, split).trim();
                        const childValue = line.slice(split + 1).trim();
                        const childIndent = lines[index].indent;
                        index += 1;
                        item[childKey] = childValue
                            ? parseScalar(childValue)
                            : parseBlock(lines[index]?.indent ?? childIndent + 2);
                    }
                    list.push(item);
                } else {
                    list.push(parseScalar(rest));
                }
            }
            return list;
        }

        const object: Record<string, any> = {};
        while (index < lines.length && lines[index].indent === indent && !lines[index].text.startsWith('- ')) {
            const line = lines[index].text;
            const colon = line.indexOf(':');
            if (colon < 0) {
                index += 1;
                continue;
            }
            const key = line.slice(0, colon).trim();
            const value = line.slice(colon + 1).trim();
            index += 1;
            object[key] = value ? parseScalar(value) : parseBlock(lines[index]?.indent ?? indent + 2);
        }
        return object;
    };

    return parseBlock(lines[0]?.indent ?? 0);
}

function scalarText(value: any): string {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'string') {
        return /^[A-Za-z0-9_./-]+$/.test(value) && value !== 'true' && value !== 'false' && value !== 'null'
            ? value
            : JSON.stringify(value);
    }
    return String(value);
}

function yamlLines(value: any, indent: number): string[] {
    const pad = ' '.repeat(indent);
    if (Array.isArray(value)) {
        return value.flatMap(item => {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                const entries = Object.entries(item);
                if (!entries.length) {
                    return [`${pad}- {}`];
                }
                return [
                    `${pad}- ${entries[0][0]}: ${scalarText(entries[0][1])}`,
                    ...entries.slice(1).map(([key, child]) => `${pad}  ${key}: ${scalarText(child)}`)
                ];
            }
            return [`${pad}- ${scalarText(item)}`];
        });
    }
    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([key, child]) => {
            if (child && typeof child === 'object') {
                return [`${pad}${key}:`, ...yamlLines(child, indent + 2)];
            }
            return [`${pad}${key}: ${scalarText(child)}`];
        });
    }
    return [`${pad}${scalarText(value)}`];
}

export function stringifyYaml(value: any): string {
    return yamlLines(value, 0).join('\n');
}
