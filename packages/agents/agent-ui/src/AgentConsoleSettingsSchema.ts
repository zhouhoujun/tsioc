import { formatAgentUiLabel, type AgentUiTranslator } from './agent-ui.i18n';
import { activateAgentConsoleMcpTool, manageAgentConsolePlugins } from './AgentConsoleSettingsIntegrationActions';
import { describeAgentConsoleWorkspaceTrust, trustAgentConsoleWorkspace } from './AgentConsoleSettingsWorkspaceTrust';
import { showAgentConsoleHooksDetail, showAgentConsoleSkillsDetail } from './AgentConsoleSettingsDetailViews';
import { openApprovalRulesPanel, readEffectiveApprovalRules } from './AgentConsoleApprovalRuleCommands';

/**
 * Settings center schema.
 *
 * Every row is declared once here: label/description, scope (workspace /
 * global / session), effect (immediate / next turn / restart / none), the value
 * shown in the list and the action that applies it. The TUI center and the web
 * settings page render this schema, so adding a setting no longer means editing
 * the store, the command file, the i18n catalog and the web adapter separately.
 */

export type AgentConsoleSettingsSectionId =
    | 'general'
    | 'model'
    | 'permissions'
    | 'agents'
    | 'integrations'
    | 'keybinds'
    | 'data';

export type AgentConsoleSettingsScope = 'workspace' | 'global' | 'session';
export type AgentConsoleSettingsEffect = 'immediate' | 'next-turn' | 'restart' | 'none';

export interface AgentConsoleSettingsSection {
    id: AgentConsoleSettingsSectionId;
    labelKey: string;
    labelFallback: string;
}

export interface AgentConsoleSettingsLabelHost {
    translator?: AgentUiTranslator | null;
}

export interface AgentConsoleSettingsHost extends AgentConsoleSettingsLabelHost {
    state: any;
    options: any;
    activeThemeName: string;
    yoloMode: boolean;
    modelReasoningEffort: string;
    runThemeCommand(): Promise<any>;
    runVimCommand(args?: string): Promise<any>;
    runDisplayCommand(args?: string): Promise<any>;
    runSteerCommand(args?: string): Promise<any>;
    runRawModeCommand(): Promise<any>;
    runFastCommand(args?: string): Promise<any>;
    runStatusCommand(): Promise<any>;
    runKeymapCommand(args: string): Promise<any>;
    runPermissionsCommand(args?: string): Promise<any>;
    runArchetypeCommand(args: string): Promise<any>;
    runPlanCommand(args: string): Promise<any>;
    runPersonalityCommand(args?: string): Promise<any>;
    runMemoriesCommand(args?: string): Promise<any>;
    runMcpCommand(args?: string): Promise<any>;
    runPluginsCommand(args?: string): Promise<any>;
    runSkillsCommand(args?: string): Promise<any>;
    runHooksCommand(): Promise<any>;
    openModelSwitcher(): Promise<any>;
    openSettingsThinkingLevel(): Promise<boolean>;
    openSettingsLanguage(): Promise<boolean>;
    openSettingsKeybindsTab(): Promise<boolean>;
    setYoloMode(enabled: boolean, notify?: boolean): Promise<void>;
    select(title: string, options: Array<{ label: string; value: string; description?: string }>, index: number, hint?: string): Promise<string | undefined>;
    invokeTool?(name: string, input: any): Promise<any>;
    appRpc?: any;
    runtime?: any;
    /** DI application context (workspace trust resolver). */
    app?: any;
    persistSettings(patch: Record<string, any>): Promise<void>;
    runInternalCommand(command: string): Promise<any>;
    notify(message: string): void;
}

export type AgentConsoleSettingsFieldKind = 'toggle' | 'action';

export interface AgentConsoleSettingsField {
    id: string;
    section: AgentConsoleSettingsSectionId;
    labelKey: string;
    labelFallback: string;
    descriptionKey: string;
    descriptionFallback: string;
    scope: AgentConsoleSettingsScope;
    effect: AgentConsoleSettingsEffect;
    /** Renderer hint: a switch (toggleRow) or a button that opens a picker/action. */
    kind: AgentConsoleSettingsFieldKind;
    /** Raw boolean state for switch rendering (toggles only). */
    read?(host: AgentConsoleSettingsHost): boolean;
    /** Searchable aliases (command names, legacy labels). */
    aliases?: string[];
    value(host: AgentConsoleSettingsHost): string;
    apply(host: AgentConsoleSettingsHost): Promise<unknown>;
    /** Restore the declared default (toggles only); absent for action rows. */
    reset?(host: AgentConsoleSettingsHost): Promise<unknown>;
}

export const AGENT_CONSOLE_SETTINGS_SECTIONS: AgentConsoleSettingsSection[] = [
    { id: 'general', labelKey: 'agent.menu.settings.sectionGeneral', labelFallback: 'General' },
    { id: 'model', labelKey: 'agent.menu.settings.sectionModel', labelFallback: 'Model' },
    { id: 'permissions', labelKey: 'agent.menu.settings.sectionPermissions', labelFallback: 'Permissions' },
    { id: 'agents', labelKey: 'agent.menu.settings.sectionAgents', labelFallback: 'Agents' },
    { id: 'integrations', labelKey: 'agent.menu.settings.sectionIntegrations', labelFallback: 'Integrations' },
    { id: 'keybinds', labelKey: 'agent.menu.settings.sectionKeybinds', labelFallback: 'Keybinds' },
    { id: 'data', labelKey: 'agent.menu.settings.sectionData', labelFallback: 'Data & tooling' }
];

export function settingsCenterLabel(
    translator: AgentUiTranslator | null | undefined,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    return formatAgentUiLabel(translator, key, fallback, params);
}

function onOff(host: AgentConsoleSettingsHost, value: boolean, shownHidden = false): string {
    return shownHidden
        ? settingsCenterLabel(host.translator, value ? 'agent.menu.settings.stateShown' : 'agent.menu.settings.stateHidden', value ? 'shown' : 'hidden')
        : settingsCenterLabel(host.translator, value ? 'agent.menu.settings.stateOn' : 'agent.menu.settings.stateOff', value ? 'on' : 'off');
}

function toggleRow(
    id: string,
    section: AgentConsoleSettingsSectionId,
    labelKey: string,
    labelFallback: string,
    descriptionKey: string,
    descriptionFallback: string,
    scope: AgentConsoleSettingsScope,
    read: (host: AgentConsoleSettingsHost) => boolean,
    apply: (host: AgentConsoleSettingsHost, next: boolean) => Promise<unknown>,
    options: { shownHidden?: boolean; effect?: AgentConsoleSettingsEffect; aliases?: string[]; defaultValue?: boolean } = {}
): AgentConsoleSettingsField {
    return {
        id,
        section,
        labelKey,
        labelFallback,
        descriptionKey,
        descriptionFallback,
        scope,
        effect: options.effect ?? 'immediate',
        kind: 'toggle',
        read,
        ...(options.aliases ? { aliases: options.aliases } : {}),
        value: host => onOff(host, read(host), options.shownHidden === true),
        apply: host => apply(host, !read(host)),
        ...(options.defaultValue === undefined
            ? {}
            : { reset: (host: AgentConsoleSettingsHost) => apply(host, options.defaultValue!) })
    };
}

function actionRow(
    id: string,
    section: AgentConsoleSettingsSectionId,
    labelKey: string,
    labelFallback: string,
    descriptionKey: string,
    descriptionFallback: string,
    scope: AgentConsoleSettingsScope,
    effect: AgentConsoleSettingsEffect,
    action: (host: AgentConsoleSettingsHost) => Promise<unknown>,
    value: (host: AgentConsoleSettingsHost) => string = () => '',
    aliases?: string[]
): AgentConsoleSettingsField {
    return {
        id,
        section,
        labelKey,
        labelFallback,
        descriptionKey,
        descriptionFallback,
        scope,
        effect,
        kind: 'action',
        ...(aliases ? { aliases } : {}),
        value,
        apply: action
    };
}

export const AGENT_CONSOLE_SETTINGS_FIELDS: AgentConsoleSettingsField[] = [
    // General / appearance / interaction
    actionRow('theme', 'general', 'agent.menu.settings.themeLabel', 'Theme: {name}', 'agent.menu.settings.themeDescription', 'apply and save a UI theme', 'global', 'immediate',
        host => host.runThemeCommand(), host => host.activeThemeName, ['/theme']),
    actionRow('language', 'general', 'agent.menu.settings.languageLabel', 'Language: {name}', 'agent.menu.settings.languageDescription', 'switch UI language', 'workspace', 'immediate',
        host => host.openSettingsLanguage(), host => host.translator?.currentLocale || 'en', ['/language']),
    toggleRow('vim', 'general', 'agent.menu.settings.vimLabel', 'Vim mode: {state}', 'agent.menu.settings.vimDescription', 'vim-style normal/insert input mode', 'workspace',
        host => !!host.state.vimMode,
        async host => {
            await host.runVimCommand('');
            await host.persistSettings({ vimMode: host.state.vimMode });
        }, { aliases: ['/vim'], defaultValue: false }),
    actionRow('raw', 'general', 'agent.menu.settings.rawLabel', 'Raw mode: {state}', 'agent.menu.settings.rawDescription', 'plain-text scrollback rendering', 'global', 'immediate',
        host => host.runRawModeCommand(),
        host => onOff(host, !!host.state.rawMode), ['/raw']),
    toggleRow('thinking', 'general', 'agent.menu.settings.thinkingLabel', 'Thinking: {state}', 'agent.menu.settings.thinkingDescription', 'reasoning message visibility', 'workspace',
        host => !!host.state.showThinking,
        async host => {
            host.state.setShowThinking(!host.state.showThinking);
            await host.persistSettings({ showThinking: host.state.showThinking });
        }, { shownHidden: true, aliases: ['/thinking'], defaultValue: true }),
    toggleRow('yolo', 'general', 'agent.menu.settings.yoloLabel', 'Yolo mode: {state}', 'agent.menu.settings.yoloDescription', 'automatically approve gated tools', 'workspace',
        host => host.yoloMode === true,
        host => host.setYoloMode(!host.yoloMode), { aliases: ['/yolo'], defaultValue: false }),
    actionRow('timestamps', 'general', 'agent.menu.settings.timestampsLabel', 'Timestamps: {state}', 'agent.menu.settings.timestampsDescription', 'message timestamp visibility', 'workspace', 'immediate',
        host => host.runDisplayCommand(''),
        host => onOff(host, !!host.state.showTimestamps, true)),
    actionRow('activity', 'general', 'agent.menu.settings.activityLabel', 'Activity verbosity: {level}', 'agent.menu.settings.activityDescription', 'collapse finished tool/reasoning runs into one row', 'workspace', 'immediate',
        host => host.runDisplayCommand('activity'),
        host => String(host.state.activityVerbosity || 'medium'), ['/display activity']),
    actionRow('steer', 'general', 'agent.menu.settings.steerLabel', 'Steer mode: {state}', 'agent.menu.settings.steerDescription', 'Enter interrupts the running turn instead of queueing', 'workspace', 'immediate',
        host => host.runSteerCommand(''),
        host => onOff(host, host.state.steerMode === true), ['/steer']),
    toggleRow('queueMode', 'general', 'agent.menu.settings.queueModeLabel', 'Queue mode: {state}', 'agent.menu.settings.queueModeDescription', 'Enter during a running turn queues instead of cancelling', 'workspace',
        host => host.options.ui?.queueMode !== false,
        async host => {
            const next = host.options.ui?.queueMode === false;
            host.options.ui = { ...(host.options.ui || {}), queueMode: next };
            await host.persistSettings({ queueMode: next });
        }, { defaultValue: true, aliases: ['/queue'] }),
    actionRow('transcriptWindow', 'general', 'agent.menu.settings.transcriptWindowLabel', 'Transcript window', 'agent.menu.settings.transcriptWindowDescription', 'rows rendered while following the latest message', 'workspace', 'immediate',
        async host => {
            const sizes = [20, 40, 80, 120];
            const current = Number(host.state.consoleOptions?.transcriptWindowMessages) || 40;
            const picked = await host.select(
                settingsCenterLabel(host.translator, 'agent.menu.settings.transcriptWindowTitle', 'Settings · Transcript window'),
                sizes.map(size => ({
                    label: `${size} messages${size === current ? ' ●' : ''}`,
                    value: String(size),
                    description: settingsCenterLabel(host.translator, 'agent.menu.settings.transcriptWindowOption', 'keep the newest {count} rows in the viewport', { count: size })
                })),
                Math.max(0, sizes.indexOf(current)),
                settingsCenterLabel(host.translator, 'agent.hint.enterApplyClose', 'enter apply   esc close')
            );
            if (!picked) return;
            const size = Number(picked) as 20 | 40 | 80 | 120;
            host.state.consoleOptions = { ...host.state.consoleOptions, transcriptWindowMessages: size };
            await host.persistSettings({ transcriptWindowMessages: size });
        },
        host => String(Number(host.state.consoleOptions?.transcriptWindowMessages) || 40), ['/display window']),
    actionRow('pagerSize', 'general', 'agent.menu.settings.pagerSizeLabel', 'Message page size: {count}', 'agent.menu.settings.pagerSizeDescription', 'rows moved by page up/down in transcript navigation', 'workspace', 'immediate',
        async host => {
            const sizes = [4, 6, 10];
            const current = Number(host.state.consoleOptions?.messageSelectionPageSize) || 6;
            const picked = await host.select(
                settingsCenterLabel(host.translator, 'agent.menu.settings.pagerSizeTitle', 'Settings · Message page size'),
                sizes.map(size => ({
                    label: `${size} rows${size === current ? ' ●' : ''}`,
                    value: String(size),
                    description: settingsCenterLabel(host.translator, 'agent.menu.settings.pagerSizeOption', 'jump {count} messages per page', { count: size })
                })),
                Math.max(0, sizes.indexOf(current)),
                settingsCenterLabel(host.translator, 'agent.hint.enterApplyClose', 'enter apply   esc close')
            );
            if (!picked) return;
            const size = Number(picked) as 4 | 6 | 10;
            host.state.consoleOptions = { ...host.state.consoleOptions, messageSelectionPageSize: size };
            await host.persistSettings({ messageSelectionPageSize: size });
        },
        host => String(Number(host.state.consoleOptions?.messageSelectionPageSize) || 6), ['/display pager']),
    toggleRow('tooloutput', 'general', 'agent.menu.settings.toolOutputLabel', 'Tool output: {state}', 'agent.menu.settings.toolOutputDescription', 'tool output visibility in messages', 'workspace',
        host => !!host.state.showToolOutput,
        async host => {
            host.state.setShowToolOutput(!host.state.showToolOutput);
            await host.persistSettings({ showToolOutput: host.state.showToolOutput });
        }, { shownHidden: true, defaultValue: true }),
    toggleRow('username', 'general', 'agent.menu.settings.usernameLabel', 'Username: {state}', 'agent.menu.settings.usernameDescription', 'username label visibility', 'workspace',
        host => !!host.state.showUsername,
        async host => {
            host.state.setShowUsername(!host.state.showUsername);
            await host.persistSettings({ showUsername: host.state.showUsername });
        }, { shownHidden: true, defaultValue: true }),
    toggleRow('title', 'general', 'agent.menu.settings.windowTitleLabel', 'Window title: {state}', 'agent.menu.settings.windowTitleDescription', 'terminal/document title sync', 'workspace',
        host => host.options.ui?.terminalTitle !== false,
        async host => {
            host.options.ui = { ...(host.options.ui || {}), terminalTitle: !(host.options.ui?.terminalTitle !== false) };
        }),
    toggleRow('highlights', 'general', 'agent.menu.settings.highlightsLabel', 'Release highlights: {state}', 'agent.menu.settings.highlightsDescription', 'show what changed after an upgrade', 'workspace',
        host => host.options.ui?.highlights !== false,
        async (host, next: boolean) => {
            host.options.ui = { ...(host.options.ui || {}), highlights: next };
            await host.persistSettings({ highlights: next });
        }, { defaultValue: true }),
    toggleRow('touch', 'general', 'agent.menu.settings.touchLabel', 'Touch mode: {state}', 'agent.menu.settings.touchDescription', 'swipe scrolls; taps still click', 'workspace',
        host => host.state.consoleOptions?.touchMode === true,
        async host => {
            const next = host.state.consoleOptions?.touchMode !== true;
            host.state.setConsoleOptions({ touchMode: next });
            await host.persistSettings({ touchMode: next });
        }),

    // Model
    actionRow('model', 'model', 'agent.menu.settings.fieldModel', 'Model: {name}', 'agent.menu.settings.fieldModelDescription', 'switch the active model profile', 'global', 'next-turn',
        host => host.openModelSwitcher(), host => String(host.options?.model?.model || '-'), ['/model']),
    actionRow('thinkingLevel', 'model', 'agent.menu.settings.providerThinkingLevel', 'Thinking level: {level}', 'agent.menu.settings.providerThinkingLevelDescription', 'set model reasoning effort', 'global', 'next-turn',
        host => host.openSettingsThinkingLevel(), host => String(host.modelReasoningEffort || 'medium'), ['/thinking level']),
    actionRow('fast', 'model', 'agent.menu.settings.providerFast', 'Fast/strong profile', 'agent.menu.settings.providerFastDescription', 'switch between fast and strong profiles', 'global', 'next-turn',
        host => host.runFastCommand(), () => '', ['/fast']),
    actionRow('status', 'model', 'agent.menu.settings.providerStatus', 'Session status', 'agent.menu.settings.providerStatusDescription', 'show current model / archetype / modes', 'session', 'none',
        host => host.runStatusCommand(), () => '', ['/status']),

    // Permissions
    actionRow('securityLevel', 'permissions', 'agent.menu.settings.fieldSecurityLevel', 'Security level: {level}', 'agent.menu.settings.fieldSecurityLevelDescription', 'read-only, ask, auto or full access', 'workspace', 'immediate',
        host => host.runPermissionsCommand('level'), host => String(host.state.securityLevel || (host.yoloMode ? 'auto' : 'ask')), ['/permissions level']),
    actionRow('sessionSecurityLevel', 'permissions', 'agent.menu.settings.fieldSessionSecurityLevel', 'Session security level: {level}', 'agent.menu.settings.fieldSessionSecurityLevelDescription', 'override the workspace level for this tab only (/permissions session)', 'session', 'immediate',
        host => host.runPermissionsCommand('session'), host => String(host.state.sessionSecurityLevels?.[host.state.sessionId] || ''), ['/permissions session']),
    actionRow('sandbox', 'permissions', 'agent.menu.settings.fieldSandbox', 'Sandbox: {mode}', 'agent.menu.settings.fieldSandboxDescription', 'OS-level isolation for executed commands', 'session', 'immediate',
        host => host.runPermissionsCommand('sandbox'), () => '', ['/permissions sandbox']),
    actionRow('approvals', 'permissions', 'agent.menu.settings.fieldApprovals', 'Pending approvals', 'agent.menu.settings.fieldApprovalsDescription', 'review and answer approval requests', 'session', 'none',
        host => host.runInternalCommand('/approvals'), host => String(host.state.pendingApprovals?.length || 0), ['/approvals']),
    actionRow('approvalTimeout', 'permissions', 'agent.menu.settings.approvalTimeoutLabel', 'Approval timeout: {seconds}s', 'agent.menu.settings.approvalTimeoutDescription', 'how long an approval waits before it times out', 'workspace', 'immediate',
        async host => {
            const seconds = [15, 30, 60, 120];
            const current = Math.round((Number(host.options?.policy?.limits?.approvalTimeoutMs) || 30000) / 1000);
            const picked = await host.select(
                settingsCenterLabel(host.translator, 'agent.menu.settings.approvalTimeoutTitle', 'Settings · Approval timeout'),
                seconds.map(value => ({
                    label: `${value}s${value === current ? ' ●' : ''}`,
                    value: String(value),
                    description: settingsCenterLabel(host.translator, 'agent.menu.settings.approvalTimeoutOption', 'wait {count}s for an approval decision', { count: value })
                })),
                Math.max(0, seconds.indexOf(current)),
                settingsCenterLabel(host.translator, 'agent.hint.enterApplyClose', 'enter apply   esc close')
            );
            if (!picked) return;
            const ms = Number(picked) * 1000;
            try {
                if (host.appRpc) {
                    await host.appRpc.request('settings.ui.set', { approvalTimeoutMs: ms }).catch(() => undefined);
                } else {
                    host.runtime?.setApprovalTimeout?.(ms);
                }
                host.options.policy = { ...(host.options.policy || {}), limits: { ...(host.options.policy?.limits || {}), approvalTimeoutMs: ms } };
                await host.persistSettings({ approvalTimeoutMs: ms });
            } catch (error: any) {
                host.notify(error?.message || String(error));
            }
        },
        host => String(Math.round((Number(host.options?.policy?.limits?.approvalTimeoutMs) || 30000) / 1000)) + 's', ['/permissions timeout']),
    actionRow('approvalRules', 'permissions', 'agent.menu.settings.approvalRulesLabel', 'Approval rules: {count}', 'agent.menu.settings.approvalRulesDescription', 'ordered ask/allow/deny rules (last match wins)', 'workspace', 'immediate',
        host => openApprovalRulesPanel(host as any),
        host => String(readEffectiveApprovalRules(host.options).length), ['/permissions rules']),
    actionRow('sessionApprovalRules', 'permissions', 'agent.menu.settings.sessionApprovalRulesLabel', 'Session approval rules: {count}', 'agent.menu.settings.sessionApprovalRulesDescription', 'override workspace rules for this tab only (workspace deny still wins)', 'session', 'immediate',
        host => host.runPermissionsCommand('rules session panel'), host => String((host.state.sessionApprovalRules?.[host.state.sessionId] || []).length), ['/permissions rules session']),
    toggleRow('readOnlyShell', 'permissions', 'agent.menu.settings.readOnlyShellLabel', 'Skip approval for read-only commands: {state}', 'agent.menu.settings.readOnlyShellDescription', 'git status, ls and cat run without prompting; pipes, redirects and writes still ask', 'workspace',
        host => host.options?.policy?.approval?.readOnlyShell === true,
        async host => {
            const next = host.options?.policy?.approval?.readOnlyShell !== true;
            try {
                if (host.appRpc) {
                    await host.appRpc.request('settings.ui.set', { readOnlyShell: next }).catch(() => undefined);
                }
                host.options.policy = {
                    ...(host.options.policy || {}),
                    approval: { ...(host.options.policy?.approval || {}), readOnlyShell: next }
                };
                await host.persistSettings({ readOnlyShell: next });
            } catch (error: any) {
                host.notify(error?.message || String(error));
            }
        },
        { defaultValue: false }),
    actionRow('workspaceTrust', 'permissions', 'agent.menu.settings.trustLabel', 'Workspace trust: {state}', 'agent.menu.settings.trustDescription', 'mutating tools are blocked until the workspace is trusted', 'workspace', 'immediate',
        host => trustAgentConsoleWorkspace(host), host => describeAgentConsoleWorkspaceTrust(host), ['/permissions trust']),
    actionRow('permissionsInspect', 'permissions', 'agent.menu.settings.fieldPermissionsInspect', 'Permission inspector', 'agent.menu.settings.fieldPermissionsInspectDescription', 'explain why a tool would be allowed or denied', 'workspace', 'none',
        host => host.runPermissionsCommand('inspect'), () => '', ['/permissions inspect']),

    // Agents
    actionRow('archetype', 'agents', 'agent.menu.settings.fieldArchetype', 'Agent profile: {name}', 'agent.menu.settings.fieldArchetypeDescription', 'default archetype for this session', 'session', 'next-turn',
        host => host.runArchetypeCommand(''), host => String(host.state.activeArchetype || 'build'), ['/archetype']),
    actionRow('plan', 'agents', 'agent.menu.settings.fieldPlan', 'Plan mode: {state}', 'agent.menu.settings.fieldPlanDescription', 'read-only planning before implementation', 'session', 'immediate',
        host => host.runPlanCommand(''), host => onOff(host, !!host.state.planMode), ['/plan']),
    actionRow('personality', 'agents', 'agent.menu.settings.fieldPersonality', 'Personality: {name}', 'agent.menu.settings.fieldPersonalityDescription', 'response style for this workspace', 'workspace', 'next-turn',
        host => host.runPersonalityCommand(''), host => String(host.options?.ui?.personality || '-'), ['/personality']),
    actionRow('memories', 'agents', 'agent.menu.settings.fieldMemories', 'Project memories: {state}', 'agent.menu.settings.fieldMemoriesDescription', 'inject project memory into turns', 'workspace', 'next-turn',
        host => host.runMemoriesCommand(''), host => onOff(host, host.options?.ui?.memoryInjection !== false), ['/memories']),
    toggleRow('crossSessionMessages', 'agents', 'agent.menu.settings.crossSessionMessagesLabel', 'Cross-session messages: {state}', 'agent.menu.settings.crossSessionMessagesDescription', 'allow /msg between sessions (agent teams)', 'workspace',
        host => host.state.crossSessionMessages === true,
        async (host, next: boolean) => {
            host.state.crossSessionMessages = next;
            await host.persistSettings({ crossSessionMessages: next });
        }, { defaultValue: false }),
    actionRow('delegation', 'agents', 'agent.menu.settings.fieldDelegation', 'Delegation mode', 'agent.menu.settings.fieldDelegationDescription', 'how sub-agents may be delegated', 'session', 'next-turn',
        host => host.runInternalCommand('/delegation'), () => '', ['/delegation']),

    // Integrations
    actionRow('mcp', 'integrations', 'agent.menu.settings.fieldMcp', 'MCP servers', 'agent.menu.settings.fieldMcpDescription', 'list MCP servers and active tools', 'session', 'none',
        host => host.runMcpCommand(''), host => String((host.state.tools || []).filter((tool: any) => String(tool?.name || '').startsWith('mcp.')).length), ['/mcp']),
    actionRow('mcpToolActivate', 'integrations', 'agent.menu.settings.mcpActivateTitle', 'Activate MCP tool', 'agent.menu.settings.mcpActivateToolDescription', 'enable an inactive MCP tool for this session', 'session', 'immediate',
        host => activateAgentConsoleMcpTool(host), host => String((host.state.tools || []).filter((tool: any) => String(tool?.name || '').startsWith('mcp.') && tool.active).length) + ' active', ['/mcp activate']),
    actionRow('plugins', 'integrations', 'agent.menu.settings.fieldPlugins', 'Plugins', 'agent.menu.settings.fieldPluginsDescription', 'inspect, activate or remove plugins', 'workspace', 'none',
        host => manageAgentConsolePlugins(host), () => '', ['/plugins']),
    actionRow('skills', 'integrations', 'agent.menu.settings.fieldSkills', 'Skills', 'agent.menu.settings.fieldSkillsDescription', 'browse installed skills', 'workspace', 'none',
        host => showAgentConsoleSkillsDetail(host), () => '', ['/skills']),
    actionRow('hooks', 'integrations', 'agent.menu.settings.fieldHooks', 'Hooks', 'agent.menu.settings.fieldHooksDescription', 'registered lifecycle hooks', 'workspace', 'none',
        host => showAgentConsoleHooksDetail(host), () => '', ['/hooks']),

    // Keybinds
    actionRow('keybindsOpen', 'keybinds', 'agent.menu.settings.keybindsTitle', 'Keybinds', 'agent.menu.settings.keybindsListDescription', 'list, record or reset key bindings', 'workspace', 'immediate',
        host => host.openSettingsKeybindsTab(), () => '', ['/keymap']),
    actionRow('keybindsList', 'keybinds', 'agent.menu.settings.keybindsList', 'List bindings', 'agent.menu.settings.keybindsListDescription', 'show effective key bindings', 'workspace', 'none',
        host => host.runKeymapCommand('list'), () => '', ['/keymap list']),
    actionRow('keybindsReset', 'keybinds', 'agent.menu.settings.keybindsReset', 'Reset to defaults', 'agent.menu.settings.keybindsResetDescription', 'restore default key bindings', 'workspace', 'immediate',
        host => host.runKeymapCommand('reset'), () => '', ['/keymap reset']),

    // Data & tooling
    actionRow('sessions', 'data', 'agent.menu.settings.dataSessions', 'Sessions', 'agent.menu.settings.dataSessionsDescription', 'switch, archive or resume sessions', 'workspace', 'none',
        host => host.runInternalCommand('/sessions'), () => '', ['/sessions']),
    actionRow('remoteCenters', 'data', 'agent.menu.settings.dataRemotes', 'Remote centers: {count}', 'agent.menu.settings.dataRemotesDescription', 'read-only session lists from other gateways', 'workspace', 'none',
        host => host.runInternalCommand('/remotes'), host => String(host.state.remoteCenters?.length || 0), ['/remotes']),
    actionRow('export', 'data', 'agent.menu.settings.dataExport', 'Export transcript', 'agent.menu.settings.dataExportDescription', 'write the session transcript to a file', 'workspace', 'none',
        host => host.runInternalCommand('/export'), () => '', ['/export']),
    actionRow('diagnostics', 'data', 'agent.menu.settings.dataDiagnostics', 'Diagnostics', 'agent.menu.settings.dataDiagnosticsDescription', 'environment, models and health checks', 'workspace', 'none',
        host => host.runInternalCommand('/diagnostics'), () => '', ['/diagnostics']),
    actionRow('reload', 'data', 'agent.menu.settings.dataReload', 'Reload configuration', 'agent.menu.settings.dataReloadDescription', 're-read workspace settings, theme and keymap', 'workspace', 'immediate',
        host => host.runInternalCommand('/reload'), () => '', ['/reload']),
    actionRow('debugConfig', 'data', 'agent.menu.settings.dataDebugConfig', 'Debug config', 'agent.menu.settings.dataDebugConfigDescription', 'show the resolved runtime configuration', 'workspace', 'none',
        host => host.runInternalCommand('/debug-config'), () => '', ['/debug-config']),
    actionRow('restart', 'data', 'agent.menu.settings.dataRestart', 'Restart', 'agent.menu.settings.dataRestartDescription', 'restart the CLI in-process', 'workspace', 'none',
        host => host.runInternalCommand('/restart'), () => '', ['/restart'])
];

export function describeSettingsScope(
    translator: AgentUiTranslator | null | undefined,
    scope: AgentConsoleSettingsScope
): string {
    if (scope === 'global') {
        return settingsCenterLabel(translator, 'agent.menu.settings.scopeGlobal', 'global');
    }
    if (scope === 'session') {
        return settingsCenterLabel(translator, 'agent.menu.settings.scopeSession', 'session');
    }
    return settingsCenterLabel(translator, 'agent.menu.settings.scopeWorkspace', 'workspace');
}

export function describeSettingsEffect(
    translator: AgentUiTranslator | null | undefined,
    effect: AgentConsoleSettingsEffect
): string {
    if (effect === 'next-turn') {
        return settingsCenterLabel(translator, 'agent.menu.settings.effectNextTurn', 'next turn');
    }
    if (effect === 'restart') {
        return settingsCenterLabel(translator, 'agent.menu.settings.effectRestart', 'needs restart');
    }
    if (effect === 'none') {
        return '';
    }
    return settingsCenterLabel(translator, 'agent.menu.settings.effectImmediate', 'immediate');
}
