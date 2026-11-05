import type { AgentConsoleSettingsData } from './AgentConsoleSettingsStore';
import { applyPersistedModelProfile, applyPersistedPreferences } from './AgentConsoleSettingsStore';
import { agentConsoleThemeNames, agentConsoleThemes, isAgentConsoleThemeName } from './AgentConsoleTheme';
import type { AgentConsoleThemeName } from './AgentConsoleTheme';
import { AGENT_CONSOLE_KEYMAP_CONTEXTS, AgentConsoleKeymapContext } from './AgentConsoleKeymap';
import { formatAgentUiNotice } from './agent-ui.i18n';
import { applyPersistedLayout } from './AgentConsoleSettingsCommands';

export async function restoreGlobalKeymap(self: any): Promise<void> {
        const persisted = await self.keymapStore?.load(self.state.workspace) || {};
        self.globalKeymap!.configure({ ...(self.options.ui?.keymap || {}), ...persisted });
        const contexts = await self.keymapStore?.loadContexts(self.state.workspace) || {};
        AGENT_CONSOLE_KEYMAP_CONTEXTS.forEach(context => {
            if (context !== 'global' && contexts[context]) {
                self.globalKeymap!.configureContext(context, contexts[context]);
            }
        });
    }

export async function persistGlobalKeymap(self: any): Promise<void> {
        const contexts: Partial<Record<AgentConsoleKeymapContext, Record<string, string | null>>> = {};
        AGENT_CONSOLE_KEYMAP_CONTEXTS.forEach(context => {
            if (context !== 'global') {
                const bindings = self.globalKeymap!.customBindingsFor(context);
                if (Object.keys(bindings).length) contexts[context] = bindings;
            }
        });
        await self.keymapStore?.save(self.state.workspace, self.globalKeymap!.customBindings, contexts);
    }

export async function restoreTheme(self: any): Promise<void> {
        const persisted = await self.themeStore?.load(self.resolveHistoryWorkspace());
        if (persisted) {
            self.activeThemeName = persisted;
            self.state.setTheme(agentConsoleThemes[persisted as AgentConsoleThemeName]);
        }
    }

export async function applyTheme(self: any, value: string): Promise<boolean> {
        if (!isAgentConsoleThemeName(value)) {
            self.notify(formatAgentUiNotice(self.translator, 'unknownThemeValue', { value: value, names: agentConsoleThemeNames.join(', ') }));
            return true;
        }
        self.activeThemeName = value;
        self.state.setTheme(agentConsoleThemes[value as AgentConsoleThemeName]);
        try {
            await self.themeStore?.save(self.resolveHistoryWorkspace(), value);
        } catch (error: any) {
            self.notify(error?.message || formatAgentUiNotice(self.translator, 'themeApplySaveFailed', { theme: value }));
            return true;
        }
        self.notify(formatAgentUiNotice(self.translator, 'themeSet', { value: value }));
        return true;
    }

export async function restoreStatusline(self: any): Promise<void> {
        const persisted = await self.statuslineStore?.load(self.resolveHistoryWorkspace());
        if (persisted) {
            self.state.setStatusline(persisted);
        }
    }

export async function restoreTitle(self: any): Promise<void> {
        const persisted = await self.titleStore?.load(self.resolveHistoryWorkspace());
        if (persisted) {
            self.state.setTitleFields(persisted);
        }
    }

export async function restoreRawMode(self: any): Promise<void> {
        const persisted = await self.rawModeStore?.load(self.resolveHistoryWorkspace());
        if (persisted) {
            self.state.setRawMode(persisted);
        }
    }

export async function restoreSettings(self: any): Promise<void> {
        const persisted = await self.settingsStore?.load(self.resolveHistoryWorkspace());
        if (!persisted) {
            return;
        }
        if (persisted.language && self.translator?.availableLocales.includes(persisted.language)) {
            self.translator.setLocale(persisted.language);
        }
        if (typeof persisted.vimMode === 'boolean') {
            self.state.setVimMode(persisted.vimMode);
        }
        if (typeof persisted.showThinking === 'boolean') {
            self.state.setShowThinking(persisted.showThinking);
        }
        if (typeof persisted.showTimestamps === 'boolean') {
            self.state.setShowTimestamps(persisted.showTimestamps);
        }
        if (typeof persisted.showToolOutput === 'boolean') {
            self.state.setShowToolOutput(persisted.showToolOutput);
        }
        if (typeof persisted.showUsername === 'boolean') {
            self.state.setShowUsername(persisted.showUsername);
        }
        if (persisted.timelineViewMode) {
            self.state.setTimelineMode(persisted.timelineViewMode);
        } else if (typeof persisted.timelineMode === 'boolean') {
            self.state.setTimelineMode(persisted.timelineMode ? 'compact' : 'off');
        }
        applyPersistedLayout(self.state, persisted, () => self.surfaceAccessor?.restartRendering?.()); applyPersistedPreferences(self.options, persisted);
        if (!(self.options.model as any)?.explicitModel) {
            const persistedProfile = String(persisted.modelProfile || '').trim();
            const directProfile = persistedProfile.includes('/');
            const profileExists = !!persistedProfile && !!(self.options.model as any)?.profiles?.[persistedProfile];
            if (directProfile) {
                if (applyPersistedModelProfile(self.options, persistedProfile)) {
                    self.state.setModelProfile(persistedProfile);
                } else {
                    self.state.setModelProfile('');
                    self.updateTerminalTitle();
                }
            } else if (persistedProfile) {
                if (profileExists) {
                    applyPersistedModelProfile(self.options, persistedProfile);
                }
                // Bare names may refer to profiles only the gateway knows about.
                self.state.setModelProfile(persistedProfile);
            }
        }
        if (persisted.thinkingLevel) {
            self.modelReasoningEffort = persisted.thinkingLevel;
            self.options.model = self.options.model || {};
            self.options.model.reasoningEffort = persisted.thinkingLevel;
        }
        if (typeof persisted.yoloMode === 'boolean') {
            await self.setYoloMode(persisted.yoloMode, false);
        }
        if (persisted.securityLevel) {
            self.state.securityLevel = persisted.securityLevel;
        }
        // restore task & plan filter state
        if (persisted.taskFilter) {
            self.state.selectedTaskFilter = persisted.taskFilter;
            self.state.selectedTaskLineageRootId = persisted.taskLineageRootId || '';
        }
        if (persisted.planTodoFilter) { self.state.planTodoFilter = persisted.planTodoFilter; }
        if (Array.isArray(persisted.openSessionIds)) { self.state.setOpenSessionIds(persisted.openSessionIds); }
    }

export async function persistSettings(self: any, patch: Partial<AgentConsoleSettingsData>): Promise<void> {
        const workspace = self.resolveHistoryWorkspace();
        const current = await self.settingsStore?.load(workspace) || {};
        await self.settingsStore?.save(workspace, { ...current, ...patch });
    }
