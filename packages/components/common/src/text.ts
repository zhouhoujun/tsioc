import { getDisplayWidth, sliceByDisplayWidth } from './display-width';

/** Renderer-neutral `{name}` interpolation used by labels and panel copy. */
export function fillTemplate(template: string | undefined, vars: Record<string, string | number>): string {
    return String(template || '').replace(/\{(\w+)\}/g, (_, key: string) =>
        key in vars ? String(vars[key]) : `{${key}}`
    );
}

/**
 * Truncates to a display-width budget with a trailing ellipsis. ANSI-aware and
 * CJK/emoji aware via the shared display-width primitives.
 */
export function truncateByDisplayWidth(value: string, maxWidth: number, ellipsis = '…'): string {
    const text = String(value || '');
    if (maxWidth <= 0) {
        return '';
    }
    if (getDisplayWidth(text) <= maxWidth) {
        return text;
    }
    const ellipsisWidth = getDisplayWidth(ellipsis);
    if (ellipsisWidth >= maxWidth) {
        return sliceByDisplayWidth(ellipsis, maxWidth);
    }
    return `${sliceByDisplayWidth(text, maxWidth - ellipsisWidth).replace(/\s+$/, '')}${ellipsis}`;
}
