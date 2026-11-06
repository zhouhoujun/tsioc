import { AGENT_UI_PANEL_RUNTIME_EN, AGENT_UI_PANEL_RUNTIME_ZH } from './agent-ui.i18n.panel.runtime';
/**
 * Panel chrome copy (session list, task/plan, jobs, tool runs, overlays,
 * command outputs, keymap, pending questions, health popover, usage/debug
 * digests and shared state words) in English and Simplified Chinese.
 *
 * Kept apart from `agent-ui.i18n.menu.ts` so both catalogs stay inside the
 * source-size budget. Values mirror the English fallbacks used by the panel
 * components, so a host without a translator still renders the previous copy.
 */

import { AGENT_UI_PANEL_CORE_EN } from './agent-ui.i18n.panel.core.en';
import { AGENT_UI_PANEL_CORE_ZH } from './agent-ui.i18n.panel.core.zh';

export const AGENT_UI_PANEL_EN: Record<string, any> = { ...AGENT_UI_PANEL_CORE_EN, ...AGENT_UI_PANEL_RUNTIME_EN };
export const AGENT_UI_PANEL_ZH: Record<string, any> = { ...AGENT_UI_PANEL_CORE_ZH, ...AGENT_UI_PANEL_RUNTIME_ZH };
