import type { ActivityContext } from '../../activities/Activity';

export function templateText(template: string, context: ActivityContext): string {
    const scopeFor = (item: any, parent: any): any =>
        item && typeof item === 'object' && !Array.isArray(item)
            ? { ...parent, ...item, '.': item }
            : { ...parent, '.': item };
    const render = (source: string, scope: any): string => {
        let text = source;
        // Mustache-style sections: arrays render the block per item, objects
        // once, falsy values render nothing. Nested sections with different
        // keys are handled because the block body is rendered recursively.
        const section = /\{\{#\s*([^}]+?)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/;
        let match: RegExpExecArray | null;
        let guard = 0;
        while ((match = section.exec(text)) && guard++ < 1000) {
            const value = resolveTemplateKey(match[1].trim(), scope);
            let replacement = '';
            if (Array.isArray(value)) {
                replacement = value.map(item => render(match![2], scopeFor(item, scope))).join('');
            } else if (value && typeof value === 'object') {
                replacement = render(match[2], scopeFor(value, scope));
            } else if (value) {
                replacement = render(match[2], scope);
            }
            text = text.slice(0, match.index) + replacement + text.slice(match.index + match[0].length);
        }
        return text.replace(/\{\{\{?\s*([^}]+?)\s*\}?\}\}/g, (_all, key: string) => {
            const value = key.trim() === '.' ? scope?.['.'] : resolveTemplateKey(key.trim(), scope);
            if (value === undefined || value === null) {
                return '';
            }
            return String(value);
        });
    };
    return render(String(template ?? ''), context);
}

export function resolveTemplateKey(key: string, scope: any): any {
    const path = String(key || '').trim();
    if (!path) {
        return undefined;
    }
    let value: any = scope;
    for (const part of path.replace(/^\$?\.?/, '').split('.').filter(Boolean)) {
        if (value === undefined || value === null) {
            return undefined;
        }
        value = value[part];
    }
    return value;
}
