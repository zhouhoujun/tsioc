import type { AgentUiTranslator } from './agent-ui.i18n';

/**
 * Locale-aware date/time formatting for user-visible UI copy.
 *
 * `Date#toLocaleDateString()` with no argument uses the *host* locale, which is
 * independent from the UI language: a zh-CN interface running under `LANG=C`
 * renders `10/25/2026` (US order) next to Chinese labels. Every user-visible
 * date/time must therefore be formatted with the active UI locale, and fall
 * back to the host default only when no locale is known.
 */

export type AgentUiDateValue = Date | number | string | null | undefined;

/** Resolve the BCP-47 tag of the active UI locale, or undefined for host default. */
export function agentUiLocale(translator?: AgentUiTranslator | null): string | undefined {
    const locale = translator?.currentLocale;
    if (typeof locale !== 'string' || !locale.trim()) {
        return undefined;
    }
    return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(locale.trim()) ? locale.trim() : undefined;
}

function toDate(value: AgentUiDateValue): Date | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    const date = value instanceof Date ? value : new Date(value as number | string);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Short date (e.g. `2026/10/25` in zh-CN, `10/25/2026` in en-US). */
export function formatAgentUiDate(
    value: AgentUiDateValue,
    translator?: AgentUiTranslator | null,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = toDate(value);
    return date ? date.toLocaleDateString(agentUiLocale(translator), options) : '';
}

/** Date + time (e.g. `2026/10/25 14:30:05` in zh-CN). */
export function formatAgentUiDateTime(
    value: AgentUiDateValue,
    translator?: AgentUiTranslator | null,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = toDate(value);
    return date ? date.toLocaleString(agentUiLocale(translator), options) : '';
}

/** Time of day only (e.g. `14:30` in zh-CN, `2:30 PM` in en-US). */
export function formatAgentUiTime(
    value: AgentUiDateValue,
    translator?: AgentUiTranslator | null,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = toDate(value);
    return date ? date.toLocaleTimeString(agentUiLocale(translator), options) : '';
}
