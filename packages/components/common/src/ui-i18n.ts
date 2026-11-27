import { token } from '@tsdi/ioc';

/** Lightweight translator surface injected by hosts that localize common widgets. */
export interface UiI18n {
    translate(key: string, params?: Record<string, any>): string | undefined;
}

export const UI_I18N = token<UiI18n>('UI_I18N');

/** Resolve a translated label with an English fallback; interpolates `{name}` params. */
export function uiText(
    i18n: UiI18n | null | undefined,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    let value: string | undefined;
    try {
        value = i18n?.translate(key, params);
    } catch {
        value = undefined;
    }
    const text = value && value !== key ? value : fallback;
    if (!params) {
        return text;
    }
    return text.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) =>
        params[name] === undefined ? match : String(params[name]));
}
