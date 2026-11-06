import { MessageFormatter, TranslatorService } from '@tsdi/i18n';
import { AGENT_UI_NOTICE_EN } from './agent-ui.i18n.notice.en';
import { AGENT_UI_ERROR_EN } from './agent-ui.i18n.error';
import { AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS, AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS, AGENT_UI_SESSION_CLOSING_MESSAGES } from './agent-ui.i18n.constants';
export interface AgentUiTranslator {
    translate(key: string, params?: any): string | undefined;
    /** BCP-47 tag of the active UI locale (e.g. `zh-CN`), used for date/time copy. */
    currentLocale?: string;
}

export * from './agent-ui.i18n.format';

const AGENT_UI_EN_TEMPLATES: Record<string, string> = {
    ...(AGENT_UI_NOTICE_EN as Record<string, string>),
    ...(AGENT_UI_ERROR_EN as Record<string, string>)
};

const AGENT_UI_ERROR_KEYS = new Set(Object.keys(AGENT_UI_ERROR_EN));

/**
 * Resolve a plain UI label through the translator, falling back to the English
 * template when the key is missing (the translator echoes missing keys).
 */
export function formatAgentUiLabel(translator: AgentUiTranslator | null | undefined, key: string, fallback: string, params?: Record<string, any>): string {
    // Hosts/tests may inject a partial translator (e.g. locale plumbing only);
    // never call a missing `translate`.
    const value = typeof translator?.translate === 'function' ? translator.translate(key, params) : undefined;
    if (value && value !== key) {
        return value;
    }
    // The English fallback can carry {placeholders} too (some hosts have no
    // translator at all), so interpolate it instead of leaking raw braces.
    return params ? agentUiFormatter.format(fallback, params, 'en') : fallback;
}

/**
 * Resolve panel chrome copy (`agent.menu.panel.<section>.<key>`) through the
 * host translator while keeping the English fallback.
 */
export function formatAgentPanelLabel(
    translator: AgentUiTranslator | null | undefined,
    section: string,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    return formatAgentUiLabel(translator, `agent.menu.panel.${section}.${key}`, fallback, params);
}

/**
 * Localize a panel status word that arrives as an identifier (`running`,
 * `completed`, …). Unknown statuses keep their raw identifier.
 */
export function formatAgentPanelStatusLabel(
    translator: AgentUiTranslator | null | undefined,
    section: string,
    status: string
): string {
    if (!status) {
        return status;
    }
    const key = status.charAt(0).toUpperCase() + status.slice(1);
    return formatAgentPanelLabel(translator, section, `status${key}`, status);
}

/** Localize a keymap action id (`new-session` → `新建会话`), keeping the raw id when unknown. */
export function formatAgentKeymapActionLabel(translator: AgentUiTranslator | null | undefined, action: string): string {
    const suffix = String(action || '').split('-').map(part => (part ? part.charAt(0).toUpperCase() + part.slice(1) : '')).join('');
    return formatAgentPanelLabel(translator, 'keymap', `action${suffix}`, action);
}

/**
 * Resolve diagnostics report copy (`agent.menu.diag.<section>.<key>`) through
 * the host translator while keeping the English fallback.
 */
export function formatAgentDiagLabel(
    translator: AgentUiTranslator | null | undefined,
    section: string,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    return formatAgentUiLabel(translator, `agent.menu.diag.${section}.${key}`, fallback, params);
}

/**
 * Resolve the transcript pager HUD copy for the host surface. The surface keeps
 * the English defaults when a host does not supply copy.
 */
export function formatAgentPagerStatusCopy(
    translator: AgentUiTranslator | null | undefined
): { plain: string; withMatches: string } {
    return {
        plain: formatAgentPanelLabel(translator, 'pager', 'plain', 'Pager · Esc close · ↑↓ scroll'),
        // The surface (not the translator) fills the match position, so the
        // placeholders are passed through as literal params.
        withMatches: formatAgentPanelLabel(
            translator, 'pager', 'withMatches',
            'Pager {index}/{total} · Esc close · ↑↓ scroll',
            { index: '{index}', total: '{total}' }
        )
    };
}

/**
 * Localize a boolean-ish config state word (`ON`/`OFF`/`none`/`(default)`).
 * The identifiers stay untranslated; only the shared display words move.
 */
export function formatAgentPanelState(
    translator: AgentUiTranslator | null | undefined,
    state: 'on' | 'off' | 'none' | 'default'
): string {
    const fallbacks: Record<string, string> = { on: 'ON', off: 'OFF', none: 'none', default: '(default)' };
    return formatAgentPanelLabel(translator, 'state', state, fallbacks[state]);
}

/**
 * The English default for a timeline role label. A renderer whose label differs
 * (a host override) keeps its own label instead of the catalog translation.
 */
export function defaultTimelineLabel(kind: string): string | undefined {
    return (agentUiEnglish.messages as any)?.agent?.timeline?.[kind];
}

const agentUiFormatter = new MessageFormatter();

/**
 * Format an agent-ui notice/error without ever rendering a raw key: resolve
 * through the wired translator (`agent.notice.*` / `agent.error.*`), else fall
 * back to the English catalog template, else return ''.
 */
export function formatAgentUiNotice(
    translator: AgentUiTranslator | null | undefined,
    key: string,
    params?: Record<string, any>
): string {
    const namespace = AGENT_UI_ERROR_KEYS.has(key) ? 'error' : 'notice';
    const fullKey = `agent.${namespace}.${key}`;
    const translated = typeof translator?.translate === 'function' ? translator.translate(fullKey, params) : undefined;
    if (translated && translated !== fullKey) {
        return translated;
    }
    const template = AGENT_UI_EN_TEMPLATES[key];
    if (template === undefined) {
        return '';
    }
    return agentUiFormatter.format(template, params || {}, 'en');
}

/**
 * Format a notice from a DI application context.
 *
 * Host adapters (CLI/TUI launcher, desktop, VS Code) hold the started context
 * rather than the console component's translator; this resolves the context's
 * `TranslatorService` so host-side notices stay localized instead of hardcoded
 * English. Falls back to the English catalog when no translator is registered.
 */
export function formatAgentUiNoticeFromContext(
    context: { get?: (token: any) => any } | null | undefined,
    key: string,
    params?: Record<string, any>
): string {
    let translator: AgentUiTranslator | undefined;
    if (context && typeof context.get === 'function') {
        try {
            translator = context.get(TranslatorService);
        } catch {
            translator = undefined;
        }
    }
    return formatAgentUiNotice(translator, key, params);
}

export const agentUiDefaultFollowUpOnlyTermLists = [
    AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS,
    AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS
] as const;

export function formatAgentUiSessionClosingMessage(locale: string | undefined, sessionId: string): string {
    const template = String(locale || '').toLowerCase().startsWith('zh')
        ? AGENT_UI_SESSION_CLOSING_MESSAGES['zh-CN']
        : AGENT_UI_SESSION_CLOSING_MESSAGES.en;
    return template.replace('{sessionId}', sessionId);
}

import { agentUiEnglish } from './agent-ui.i18n.bundle.en';
export { agentUiEnglish } from './agent-ui.i18n.bundle.en';
export { agentUiChinese } from './agent-ui.i18n.bundle.zh';
