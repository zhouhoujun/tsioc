/**
 * Read/write a config value addressed by a dynamic-form field path such as
 * `password` or `rules[0].value`. The inspector's field actions name list rows
 * this way, so a single action handler can edit top-level and nested fields.
 */
const SEGMENT = /([^.[\]]+)|\[(\d+)\]/g;

export function configPathSegments(path: string): Array<string | number> {
    const segments: Array<string | number> = [];
    const text = String(path ?? '');
    let match: RegExpExecArray | null;
    SEGMENT.lastIndex = 0;
    while ((match = SEGMENT.exec(text))) {
        segments.push(match[2] !== undefined ? Number(match[2]) : match[1]);
    }
    return segments;
}

export function readConfigPath(config: Record<string, any> | undefined, path: string): any {
    let current: any = config;
    for (const segment of configPathSegments(path)) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[segment as any];
    }
    return current;
}

/**
 * Shallow patch that sets `path` immutably, suitable for
 * `designer.updateNodeConfig` (which merges the top-level keys). Arrays along
 * the path are copied; objects inside them are copied only where they change.
 */
export function patchConfigPath(
    config: Record<string, any> | undefined,
    path: string,
    value: any
): Record<string, any> {
    const segments = configPathSegments(path);
    if (!segments.length) {
        return {};
    }
    const assign = (target: any, index: number): any => {
        const key = segments[index];
        if (index === segments.length - 1) {
            return setKey(target, key, value);
        }
        const container = target && typeof target === 'object' ? target : {};
        return setKey(container, key, assign(container[key as any], index + 1));
    };
    const result = assign(config, 0);
    return result;
}

function setKey(target: any, key: string | number, value: any): any {
    if (typeof key === 'number') {
        const list = Array.isArray(target) ? target.slice() : [];
        while (list.length < key) {
            list.push(undefined);
        }
        list[key] = value;
        return list;
    }
    return { ...(target && typeof target === 'object' && !Array.isArray(target) ? target : {}), [key]: value };
}
