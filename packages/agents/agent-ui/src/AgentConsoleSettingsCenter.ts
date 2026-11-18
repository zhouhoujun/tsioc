import { dismissBackgroundPanels } from './AgentConsoleDialogExclusivity';
import {
    AGENT_CONSOLE_SETTINGS_FIELDS,
    AGENT_CONSOLE_SETTINGS_SECTIONS,
    AgentConsoleSettingsField,
    AgentConsoleSettingsHost,
    AgentConsoleSettingsSectionId,
    describeSettingsEffect,
    describeSettingsScope,
    settingsCenterLabel
} from './AgentConsoleSettingsSchema';

/** One rendered row of the settings center (list item + badges). */
export interface AgentConsoleSettingsRow {
    id: string;
    section: AgentConsoleSettingsSectionId;
    label: string;
    value: string;
    description: string;
    scope: string;
    effect: string;
    aliases: string;
    selected: boolean;
}

export interface AgentConsoleSettingsCenterState {
    closeTextOverlay?(): void;
    settingsCenterOpen: boolean;
    settingsCenterSection: AgentConsoleSettingsSectionId;
    settingsCenterQuery: string;
    settingsCenterIndex: number;
    settingsCenterRows: AgentConsoleSettingsRow[];
    settingsCenterTitle: string;
    settingsCenterMeta: string;
    settingsCenterHint: string;
    settingsCenterPickAction?: (id: string) => void | Promise<void>;
    settingsCenterSectionPickAction?: (id: AgentConsoleSettingsSectionId) => void | Promise<void>;
    closeSettingsCenter(): void;
    syncDerivedInputFocus(): void;
}

export interface AgentConsoleSettingsCenterHost extends AgentConsoleSettingsHost {
    state: AgentConsoleSettingsCenterState;
}

function sectionLabel(host: AgentConsoleSettingsCenterHost, id: AgentConsoleSettingsSectionId): string {
    const section = AGENT_CONSOLE_SETTINGS_SECTIONS.find(item => item.id === id);
    return section
        ? settingsCenterLabel(host.translator, section.labelKey, section.labelFallback)
        : String(id);
}

/**
 * Rows for the current query/section. With a query the whole schema is
 * searched (command aliases included); otherwise only the active section is
 * listed. Selection is preserved by row id across refreshes.
 */
export function buildAgentConsoleSettingsRows(host: AgentConsoleSettingsCenterHost): AgentConsoleSettingsRow[] {
    const state = host.state;
    const query = String(state.settingsCenterQuery || '').trim().toLowerCase();
    const previous = state.settingsCenterRows?.[state.settingsCenterIndex]?.id;
    const fields = AGENT_CONSOLE_SETTINGS_FIELDS.filter(field => {
        if (!query) {
            return field.section === state.settingsCenterSection;
        }
        const label = settingsCenterLabel(host.translator, field.labelKey, field.labelFallback);
        const description = settingsCenterLabel(host.translator, field.descriptionKey, field.descriptionFallback);
        const haystack = [
            field.id,
            field.section,
            label,
            description,
            ...(field.aliases || [])
        ].join(' ').toLowerCase();
        return haystack.includes(query);
    });
    const rows = fields.map(field => ({
        id: field.id,
        section: field.section,
        label: settingsCenterLabel(host.translator, field.labelKey, field.labelFallback, { name: '', state: '', level: '' }).replace(/[:：]\s*$/, '') || field.labelFallback,
        value: field.value(host),
        description: [
            query ? sectionLabel(host, field.section) : '',
            settingsCenterLabel(host.translator, field.descriptionKey, field.descriptionFallback)
        ].filter(Boolean).join(' · '),
        scope: describeSettingsScope(host.translator, field.scope),
        effect: describeSettingsEffect(host.translator, field.effect),
        aliases: (field.aliases || []).join(' '),
        selected: false
    }));
    const preserved = previous ? rows.findIndex(row => row.id === previous) : -1;
    const index = preserved >= 0
        ? preserved
        : Math.max(0, Math.min(rows.length - 1, state.settingsCenterIndex || 0));
    state.settingsCenterIndex = index;
    rows.forEach((row, rowIndex) => { row.selected = rowIndex === index; });
    state.settingsCenterRows = rows;
    state.settingsCenterTitle = query
        ? settingsCenterLabel(host.translator, 'agent.menu.settings.searchTitle', 'Settings · search "{query}"', { query: state.settingsCenterQuery.trim() })
        : `${settingsCenterLabel(host.translator, 'agent.menu.settings.title', 'Settings')} · ${sectionLabel(host, state.settingsCenterSection)}`;
    state.settingsCenterMeta = query
        ? settingsCenterLabel(host.translator, 'agent.menu.settings.searchMeta', '{count} matching settings', { count: rows.length })
        : `${sectionLabel(host, state.settingsCenterSection)} · ${rows.length}`;
    state.settingsCenterHint = settingsCenterLabel(
        host.translator,
        'agent.menu.settings.centerHint',
        'up/down move   left/right section   enter apply   ctrl+r reset   type to search   esc close'
    );
    return rows;
}

export function openAgentConsoleSettings(host: AgentConsoleSettingsCenterHost, query?: string, section?: AgentConsoleSettingsSectionId): void {
    const state = host.state;
    state.settingsCenterOpen = true;
    state.settingsCenterQuery = String(query || '').trim();
    state.settingsCenterIndex = 0;
    if (section) {
        state.settingsCenterSection = section;
    }
    state.settingsCenterPickAction = (id: string) => applySettingsCenterSelection(host, id);
    state.settingsCenterSectionPickAction = (id: AgentConsoleSettingsSectionId) => selectSettingsCenterSection(host, id);
    dismissBackgroundPanels(state as any);
    buildAgentConsoleSettingsRows(host);
    state.syncDerivedInputFocus();
}

export function closeAgentConsoleSettings(host: AgentConsoleSettingsCenterHost): void {
    host.state.closeSettingsCenter();
}

export function moveSettingsCenterSelection(host: AgentConsoleSettingsCenterHost, delta: number): void {
    const state = host.state;
    const rows = state.settingsCenterRows || [];
    if (!rows.length) {
        return;
    }
    const index = (state.settingsCenterIndex + delta + rows.length) % rows.length;
    state.settingsCenterIndex = index;
    rows.forEach((row, rowIndex) => { row.selected = rowIndex === index; });
}

/** Jump directly to a section (section strip click). */
export function selectSettingsCenterSection(host: AgentConsoleSettingsCenterHost, id: AgentConsoleSettingsSectionId): void {
    const state = host.state;
    if (!AGENT_CONSOLE_SETTINGS_SECTIONS.some(section => section.id === id)) {
        return;
    }
    state.settingsCenterSection = id;
    state.settingsCenterQuery = '';
    state.settingsCenterIndex = 0;
    buildAgentConsoleSettingsRows(host);
}

export function switchSettingsCenterSection(host: AgentConsoleSettingsCenterHost, delta: number): void {
    const state = host.state;
    const sections = AGENT_CONSOLE_SETTINGS_SECTIONS;
    const current = Math.max(0, sections.findIndex(section => section.id === state.settingsCenterSection));
    const next = sections[(current + delta + sections.length) % sections.length];
    state.settingsCenterSection = next.id;
    state.settingsCenterQuery = '';
    state.settingsCenterIndex = 0;
    buildAgentConsoleSettingsRows(host);
}

export function setSettingsCenterQuery(host: AgentConsoleSettingsCenterHost, query: string): void {
    host.state.settingsCenterQuery = query;
    host.state.settingsCenterIndex = 0;
    buildAgentConsoleSettingsRows(host);
}

function fieldById(id: string): AgentConsoleSettingsField | undefined {
    return AGENT_CONSOLE_SETTINGS_FIELDS.find(field => field.id === id);
}

/** Rows that open another dialog/menu: close the page so overlays never stack. */
const AGENT_CONSOLE_SETTINGS_CLOSING_ROWS = new Set([
    'theme', 'language', 'transcriptWindow', 'pagerSize',
    'model', 'thinkingLevel', 'fast', 'status',
    'securityLevel', 'sandbox', 'approvals', 'permissionsInspect',
    'archetype', 'personality', 'memories', 'delegation',
    'mcp', 'mcpToolActivate', 'plugins', 'skills', 'hooks',
    'keybindsOpen', 'keybindsList', 'keybindsReset',
    'sessions', 'export', 'diagnostics', 'reload', 'debugConfig', 'restart'
]);

export async function applySettingsCenterSelection(host: AgentConsoleSettingsCenterHost, id?: string): Promise<void> {
    const state = host.state;
    const rowId = id || state.settingsCenterRows?.[state.settingsCenterIndex]?.id;
    const field = rowId ? fieldById(rowId) : undefined;
    if (!field) {
        return;
    }
    if (AGENT_CONSOLE_SETTINGS_CLOSING_ROWS.has(field.id)) {
        closeAgentConsoleSettings(host);
    }
    try {
        await field.apply(host);
    } catch (error: any) {
        host.notify(error?.message || String(error));
    }
    if (state.settingsCenterOpen) {
        buildAgentConsoleSettingsRows(host);
        state.syncDerivedInputFocus();
    }
}

export async function resetSettingsCenterSelection(host: AgentConsoleSettingsCenterHost): Promise<void> {
    const state = host.state;
    const field = state.settingsCenterRows?.[state.settingsCenterIndex]
        ? fieldById(state.settingsCenterRows[state.settingsCenterIndex].id)
        : undefined;
    if (!field?.reset) {
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.resetUnavailable', 'This setting has no default to restore.'));
        return;
    }
    try {
        await field.reset(host);
    } catch (error: any) {
        host.notify(error?.message || String(error));
    }
    if (state.settingsCenterOpen) {
        buildAgentConsoleSettingsRows(host);
        state.syncDerivedInputFocus();
    }
}

/**
 * One decoded key while the center is open. Returns true when consumed so the
 * transcript/composer never sees settings navigation keys.
 */
export async function handleSettingsCenterKey(
    host: AgentConsoleSettingsCenterHost,
    key: string,
    text?: string
): Promise<boolean> {
    const state = host.state;
    if (!state.settingsCenterOpen) {
        return false;
    }
    switch (key) {
        case 'escape':
            if (state.settingsCenterQuery) {
                setSettingsCenterQuery(host, '');
            } else {
                closeAgentConsoleSettings(host);
            }
            return true;
        case 'up': moveSettingsCenterSelection(host, -1); return true;
        case 'down': moveSettingsCenterSelection(host, 1); return true;
        case 'left': switchSettingsCenterSection(host, -1); return true;
        case 'right': switchSettingsCenterSection(host, 1); return true;
        case 'tab': switchSettingsCenterSection(host, 1); return true;
        case 'focus-out': switchSettingsCenterSection(host, -1); return true;
        case 'return': await applySettingsCenterSelection(host); return true;
        case 'backspace':
            setSettingsCenterQuery(host, state.settingsCenterQuery.slice(0, -1));
            return true;
        default:
            break;
    }
    if (key === 'ctrl+r') {
        await resetSettingsCenterSelection(host);
        return true;
    }
    const printable = (text || '').replace(/[\u0000-\u001f\u007f]/g, '');
    if (printable) {
        setSettingsCenterQuery(host, `${state.settingsCenterQuery}${printable}`);
        return true;
    }
    return true;
}
