import { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { formatAgentUiLabel } from './agent-ui.i18n';

export type AgentWizardStepId = 'provider' | 'base-url' | 'auth' | 'credential' | 'tiers' | 'model-fast' | 'model-balanced' | 'model-strong' | 'confirm';

/**
 * Resolves a wizard copy key, falling back to the English template. Pure
 * builders accept it so the same flow renders in the host locale; an omitted
 * translate keeps the previous English strings (tests, non-UI callers).
 */
export type WizardTranslate = (key: string, fallback: string, params?: Record<string, any>) => string;

export const defaultWizardTranslate: WizardTranslate = (key, fallback, params) =>
    formatAgentUiLabel(undefined, key, fallback, params);

export interface AgentWizardStepDef {
    id: AgentWizardStepId;
    kind: 'choose' | 'enter' | 'confirm';
    label: string;
}

export interface AgentWizardProviderDef {
    id: string;
    label: string;
    adapter: 'openai-compatible' | 'anthropic' | 'openai';
    baseUrl: string;
    apiKeyEnv: string;
    models: string[];
}

export type AgentWizardValues = Record<string, any>;

export const AGENT_WIZARD_PROVIDERS: AgentWizardProviderDef[] = [
    { id: 'deepseek', label: 'DeepSeek', adapter: 'openai-compatible', baseUrl: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY', models: ['deepseek-chat', 'deepseek-reasoner'] },
    { id: 'openai', label: 'OpenAI', adapter: 'openai', baseUrl: 'https://api.openai.com', apiKeyEnv: 'OPENAI_API_KEY', models: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-5'] },
    { id: 'anthropic', label: 'Anthropic', adapter: 'anthropic', baseUrl: 'https://api.anthropic.com', apiKeyEnv: 'ANTHROPIC_API_KEY', models: ['claude-haiku-3-5', 'claude-sonnet-4', 'claude-opus-4-1'] },
    { id: 'gemini', label: 'Google Gemini', adapter: 'openai-compatible', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', apiKeyEnv: 'GEMINI_API_KEY', models: ['gemini-2.5-flash', 'gemini-2.5-pro'] },
    { id: 'custom-openai', label: 'Custom OpenAI-compatible', adapter: 'openai-compatible', baseUrl: '', apiKeyEnv: 'OPENAI_API_KEY', models: [] },
    { id: 'custom-anthropic', label: 'Custom Anthropic-compatible', adapter: 'anthropic', baseUrl: '', apiKeyEnv: 'ANTHROPIC_API_KEY', models: [] }
];

export const AGENT_WIZARD_TIERS: Array<{ id: 'single' | 'pair' | 'auto'; label: string; description: string }> = [
    { id: 'single', label: 'Single model', description: 'One model for everything' },
    { id: 'pair', label: 'Fast + strong', description: 'Two models: fast for light work, strong for deep dives' },
    { id: 'auto', label: 'Auto routing', description: 'Fast, balanced, and strong; complexity decides' }
];

export function resolveWizardProviderDef(id?: string): AgentWizardProviderDef | undefined {
    return AGENT_WIZARD_PROVIDERS.find(item => item.id === id);
}

/**
 * Display label for a preset provider. Brand names stay as-is; the two
 * "custom …-compatible" entries are UI copy and follow the host locale.
 */
export function resolveWizardProviderLabel(
    def?: AgentWizardProviderDef,
    t: WizardTranslate = defaultWizardTranslate
): string {
    if (!def) {
        return t('agent.menu.provider.steps.summaryProviderFallback', 'Provider');
    }
    if (def.id === 'custom-openai') {
        return t('agent.menu.provider.steps.customOpenAiLabel', def.label);
    }
    if (def.id === 'custom-anthropic') {
        return t('agent.menu.provider.steps.customAnthropicLabel', def.label);
    }
    return def.label;
}

export function resolveWizardTierLabel(tier?: string, t: WizardTranslate = defaultWizardTranslate): string {
    const id = (tier || 'auto') as 'single' | 'pair' | 'auto';
    const fallback = AGENT_WIZARD_TIERS.find(item => item.id === id)?.label || 'Auto routing';
    return t(`agent.menu.provider.steps.tier${id.charAt(0).toUpperCase()}${id.slice(1)}`, fallback);
}

function tierCopy(id: 'single' | 'pair' | 'auto', t: WizardTranslate): { label: string; description: string } {
    const def = AGENT_WIZARD_TIERS.find(item => item.id === id)!;
    const suffix = `${id.charAt(0).toUpperCase()}${id.slice(1)}`;
    return {
        label: t(`agent.menu.provider.steps.tier${suffix}`, def.label),
        description: t(`agent.menu.provider.steps.tier${suffix}Description`, def.description)
    };
}

export function resolveWizardProviderName(values: AgentWizardValues = {}): string {
    const def = resolveWizardProviderDef(values.providerId);
    const base = values.providerId || 'custom';
    if (!def) {
        return base;
    }
    if (def.baseUrl) {
        return def.id;
    }
    const host = String(values.baseUrl || '').replace(/^https?:\/\//i, '').split(/[/:]/)[0].trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    return host || 'custom';
}

function wizardLiveModels(values: AgentWizardValues): string[] {
    return Array.isArray(values.availableModels) ? values.availableModels.map(String).filter(Boolean) : [];
}

function liveModelChoices(values: AgentWizardValues, t: WizardTranslate): AgentConsoleSelectOption[] {
    return [
        ...wizardLiveModels(values).map((id, index) => ({ label: id, value: id, shortcut: String(index + 1) })),
        {
            label: t('agent.menu.provider.steps.modelCustom', 'Custom model…'),
            value: '__custom__',
            description: t('agent.menu.provider.steps.modelCustomDescription', 'Enter a model id manually')
        }
    ];
}

function liveModelIndex(values: AgentWizardValues, current: string | undefined, fallback: number): number {
    const models = wizardLiveModels(values);
    const index = current ? models.indexOf(current) : -1;
    return index >= 0 ? index : Math.max(0, Math.min(models.length - 1, fallback));
}

function midpointModel(def?: AgentWizardProviderDef): string {
    if (!def?.models.length) {
        return '';
    }
    return def.models[Math.floor((def.models.length - 1) / 2)] || def.models[0];
}

export interface AgentWizardStepHandler {
    kind: 'choose' | 'enter' | 'confirm';
    label(values: AgentWizardValues, t: WizardTranslate): string;
    help(values: AgentWizardValues, t: WizardTranslate): string;
    prefill?(values: AgentWizardValues): string;
    choices?(values: AgentWizardValues, t: WizardTranslate): AgentConsoleSelectOption[];
    choiceTitle?(values: AgentWizardValues, t: WizardTranslate): string;
    choiceIndex?(values: AgentWizardValues): number;
    applyChoice?(values: AgentWizardValues, value: string): void;
    applyEnter?(values: AgentWizardValues, value: string): void;
}

export const WIZARD_STEP_HANDLERS: Record<AgentWizardStepId, AgentWizardStepHandler> = {
    provider: {
        kind: 'choose',
        label: (_values, t) => t('agent.menu.provider.steps.providerLabel', 'Choose a provider'),
        help: (_values, t) => t('agent.menu.provider.steps.providerHelp', 'Pick a provider to connect. Custom providers let you bring your own API URL.'),
        choiceTitle: (_values, t) => t('agent.menu.provider.steps.providerChoiceTitle', 'Add provider · choose provider'),
        choiceIndex: () => 0,
        choices: (_values, t) => {
            const options: AgentConsoleSelectOption[] = AGENT_WIZARD_PROVIDERS.map((item, index) => ({
                label: resolveWizardProviderLabel(item, t),
                value: item.id,
                description: `${item.adapter} · ${item.baseUrl || t('agent.menu.provider.steps.customBaseUrl', 'custom base URL')}`,
                detail: item.models.length
                    ? t('agent.menu.provider.steps.suggestedModels', 'Suggested models: {models}', { models: item.models.join(', ') })
                    : t('agent.menu.provider.steps.bringOwn', 'Bring your own base URL and model names'),
                shortcut: String(index + 1)
            }));
            options.push({
                label: t('agent.menu.provider.steps.cancel', 'Cancel'),
                value: '__cancel__',
                description: t('agent.menu.provider.steps.cancelDescription', 'Abort adding a provider')
            });
            return options;
        },
        applyChoice: (values, value) => {
            values.providerId = value;
            const def = resolveWizardProviderDef(value);
            values.baseUrl = def?.baseUrl || '';
            values.authMode = 'key';
            values.tiers = 'auto';
        }
    },
    'base-url': {
        kind: 'enter',
        label: (_values, t) => t('agent.menu.provider.steps.baseUrlLabel', 'API base URL'),
        help: (_values, t) => t('agent.menu.provider.steps.baseUrlHelp', 'Enter the API endpoint, e.g. https://api.example.com/v1.'),
        prefill: values => values.baseUrl || resolveWizardProviderDef(values.providerId)?.baseUrl || '',
        applyEnter: (values, value) => {
            values.baseUrl = value.replace(/\/+$/, '');
            values.availableModels = undefined;
            values.manualModels = false;
        }
    },
    auth: {
        kind: 'choose',
        label: (_values, t) => t('agent.menu.provider.steps.authLabel', 'Authentication'),
        help: (_values, t) => t('agent.menu.provider.steps.authHelp', 'Choose how the API key is provided.'),
        choiceTitle: (values, t) => t('agent.menu.provider.steps.authChoiceTitle', '{provider} · authentication', {
            provider: resolveWizardProviderLabel(resolveWizardProviderDef(values.providerId), t)
        }),
        choiceIndex: values => (values.authMode === 'env' ? 1 : 0),
        choices: (values, t) => [
            {
                label: t('agent.menu.provider.steps.authKey', 'Enter API key'),
                value: 'key',
                description: t('agent.menu.provider.steps.authKeyDescription', 'Store the key in this configuration')
            },
            {
                label: t('agent.menu.provider.steps.authEnv', 'Use environment variable'),
                value: 'env',
                description: t('agent.menu.provider.steps.authEnvDescription', 'Reference {env} from the environment', {
                    env: resolveWizardProviderDef(values.providerId)?.apiKeyEnv || 'PROVIDER_API_KEY'
                })
            }
        ],
        applyChoice: (values, value) => {
            if (value === 'key' || value === 'env') {
                values.authMode = value;
                values.availableModels = undefined;
                values.manualModels = false;
                if (value === 'env') {
                    values.credential = resolveWizardProviderDef(values.providerId)?.apiKeyEnv || values.credential;
                }
            }
        }
    },
    credential: {
        kind: 'enter',
        label: (values, t) => values.authMode === 'env'
            ? t('agent.menu.provider.steps.credentialEnv', 'Environment variable')
            : t('agent.menu.provider.steps.credentialKey', 'API key'),
        help: (values, t) => values.authMode === 'env'
            ? t('agent.menu.provider.steps.credentialEnvHelp', 'Enter the environment variable that holds the API key, or accept the suggested one.')
            : t('agent.menu.provider.steps.credentialKeyHelp', 'Paste the API key. It is stored locally and never shown again.'),
        prefill: values => values.credential || (values.authMode === 'env' ? resolveWizardProviderDef(values.providerId)?.apiKeyEnv || '' : ''),
        applyEnter: (values, value) => {
            values.credential = value;
            values.availableModels = undefined;
            values.manualModels = false;
        }
    },
    tiers: {
        kind: 'choose',
        label: (_values, t) => t('agent.menu.provider.steps.tiersLabel', 'Model routing'),
        help: (_values, t) => t('agent.menu.provider.steps.tiersHelp', 'Choose how many models to configure for this provider.'),
        choiceTitle: (values, t) => t('agent.menu.provider.steps.tiersChoiceTitle', '{provider} · model routing', {
            provider: resolveWizardProviderDef(values.providerId)?.label || t('agent.menu.provider.steps.summaryProviderFallback', 'Provider')
        }),
        choiceIndex: values => Math.max(0, AGENT_WIZARD_TIERS.findIndex(item => item.id === (values.tiers || 'auto'))),
        choices: (_values, t) => AGENT_WIZARD_TIERS.map((item, index) => ({
            ...tierCopy(item.id, t),
            value: item.id,
            shortcut: String(index + 1)
        })),
        applyChoice: (values, value) => {
            values.tiers = value as 'single' | 'pair' | 'auto';
        }
    },
    'model-fast': {
        kind: 'enter',
        label: (values, t) => (values.tiers || 'auto') === 'single'
            ? t('agent.menu.provider.steps.modelSingleLabel', 'Model')
            : t('agent.menu.provider.steps.modelLabel', 'Fast model'),
        help: (values, t) => {
            const def = resolveWizardProviderDef(values.providerId);
            if (wizardLiveModels(values).length) {
                return t('agent.menu.provider.steps.modelLiveHelp', 'Live models from {provider} ({count}); choose one.', {
                    provider: resolveWizardProviderLabel(def, t),
                    count: wizardLiveModels(values).length
                });
            }
            return def?.models.length
                ? t('agent.menu.provider.steps.modelSuggested', 'Suggested: {model}.', { model: def.models[0] })
                : t('agent.menu.provider.steps.modelEnter', 'Enter the model identifier to use.');
        },
        prefill: values => values.modelFast || wizardLiveModels(values)[0] || resolveWizardProviderDef(values.providerId)?.models[0] || '',
        choices: (values, t) => liveModelChoices(values, t),
        choiceIndex: values => liveModelIndex(values, values.modelFast, 0),
        applyChoice: (values, value) => {
            if (value !== '__custom__') {
                values.modelFast = value;
            }
        },
        applyEnter: (values, value) => {
            values.modelFast = value;
        }
    },
    'model-balanced': {
        kind: 'enter',
        label: (_values, t) => t('agent.menu.provider.steps.modelBalancedLabel', 'Balanced model'),
        help: (values, t) => {
            const def = resolveWizardProviderDef(values.providerId);
            if (wizardLiveModels(values).length) {
                return t('agent.menu.provider.steps.modelLiveHelp', 'Live models from {provider} ({count}); choose one.', {
                    provider: resolveWizardProviderLabel(def, t),
                    count: wizardLiveModels(values).length
                });
            }
            return def?.models.length
                ? t('agent.menu.provider.steps.modelSuggested', 'Suggested: {model}.', { model: midpointModel(def) })
                : t('agent.menu.provider.steps.modelEnterBalanced', 'Enter the balanced model identifier.');
        },
        prefill: values => values.modelBalanced || wizardLiveModels(values)[Math.floor((wizardLiveModels(values).length - 1) / 2)] || midpointModel(resolveWizardProviderDef(values.providerId)) || '',
        choices: (values, t) => liveModelChoices(values, t),
        choiceIndex: values => liveModelIndex(values, values.modelBalanced, Math.floor((wizardLiveModels(values).length - 1) / 2)),
        applyChoice: (values, value) => {
            if (value !== '__custom__') {
                values.modelBalanced = value;
            }
        },
        applyEnter: (values, value) => {
            values.modelBalanced = value;
        }
    },
    'model-strong': {
        kind: 'enter',
        label: (_values, t) => t('agent.menu.provider.steps.modelStrongLabel', 'Strong model'),
        help: (values, t) => {
            const def = resolveWizardProviderDef(values.providerId);
            if (wizardLiveModels(values).length) {
                return t('agent.menu.provider.steps.modelLiveHelp', 'Live models from {provider} ({count}); choose one.', {
                    provider: resolveWizardProviderLabel(def, t),
                    count: wizardLiveModels(values).length
                });
            }
            return def?.models.length
                ? t('agent.menu.provider.steps.modelSuggested', 'Suggested: {model}.', { model: def.models[def.models.length - 1] })
                : t('agent.menu.provider.steps.modelEnterStrong', 'Enter the strong model identifier.');
        },
        prefill: values => {
            const def = resolveWizardProviderDef(values.providerId);
            const live = wizardLiveModels(values);
            const suggested = live[live.length - 1] || (def?.models.length ? def.models[def.models.length - 1] : '');
            return values.modelStrong || suggested || '';
        },
        choices: (values, t) => liveModelChoices(values, t),
        choiceIndex: values => liveModelIndex(values, values.modelStrong, wizardLiveModels(values).length - 1),
        applyChoice: (values, value) => {
            if (value !== '__custom__') {
                values.modelStrong = value;
            }
        },
        applyEnter: (values, value) => {
            values.modelStrong = value;
        }
    },
    confirm: {
        kind: 'confirm',
        label: (_values, t) => t('agent.menu.provider.steps.confirmLabel', 'Review & save'),
        help: (_values, t) => t('agent.menu.provider.steps.confirmHelp', 'Review the provider details, then choose how to save.')
    }
};

export function buildProviderWizardSteps(
    values: AgentWizardValues = {},
    t: WizardTranslate = defaultWizardTranslate
): AgentWizardStepDef[] {
    const def = resolveWizardProviderDef(values.providerId);
    const steps: AgentWizardStepDef[] = [
        { id: 'provider', kind: 'choose', label: WIZARD_STEP_HANDLERS.provider.label(values, t) }
    ];
    if (!def || !def.baseUrl) {
        steps.push({ id: 'base-url', kind: 'enter', label: WIZARD_STEP_HANDLERS['base-url'].label(values, t) });
    }
    steps.push({ id: 'auth', kind: 'choose', label: WIZARD_STEP_HANDLERS.auth.label(values, t) });
    steps.push({ id: 'credential', kind: 'enter', label: WIZARD_STEP_HANDLERS.credential.label(values, t) });
    steps.push({ id: 'tiers', kind: 'choose', label: WIZARD_STEP_HANDLERS.tiers.label(values, t) });
    const tiers = values.tiers || 'auto';
    const modelKind: 'choose' | 'enter' = wizardLiveModels(values).length && !values.manualModels ? 'choose' : 'enter';
    steps.push({ id: 'model-fast', kind: modelKind, label: WIZARD_STEP_HANDLERS['model-fast'].label(values, t) });
    if (tiers === 'auto') {
        steps.push({ id: 'model-balanced', kind: modelKind, label: WIZARD_STEP_HANDLERS['model-balanced'].label(values, t) });
    }
    if (tiers !== 'single') {
        steps.push({ id: 'model-strong', kind: modelKind, label: WIZARD_STEP_HANDLERS['model-strong'].label(values, t) });
    }
    steps.push({ id: 'confirm', kind: 'confirm', label: WIZARD_STEP_HANDLERS.confirm.label(values, t) });
    return steps;
}

export function buildWizardStepHelp(
    step: AgentWizardStepDef,
    values: AgentWizardValues = {},
    t: WizardTranslate = defaultWizardTranslate
): string {
    return WIZARD_STEP_HANDLERS[step.id]?.help(values, t) ?? '';
}

export function resolveWizardPrefill(step: AgentWizardStepDef, values: AgentWizardValues = {}): string {
    return WIZARD_STEP_HANDLERS[step.id]?.prefill?.(values) ?? '';
}

export function applyWizardStepChoice(values: AgentWizardValues, stepId: AgentWizardStepId, value: string): void {
    WIZARD_STEP_HANDLERS[stepId]?.applyChoice?.(values, value);
}

export function applyWizardStepEnter(values: AgentWizardValues, stepId: AgentWizardStepId, value: string): void {
    WIZARD_STEP_HANDLERS[stepId]?.applyEnter?.(values, value);
}

export function buildProviderWizardSummary(
    values: AgentWizardValues = {},
    t: WizardTranslate = defaultWizardTranslate
): string[] {
    const def = resolveWizardProviderDef(values.providerId);
    const baseUrl = values.baseUrl || def?.baseUrl || '';
    const credential = values.authMode === 'env'
        ? t('agent.menu.provider.steps.summaryEnv', 'env {name}', { name: values.credential || '' })
        : t('agent.menu.provider.steps.summaryApiKey', 'API key set');
    const models = [values.modelFast, values.modelBalanced, values.modelStrong].filter(Boolean).join(' · ');
    return [
        `${def?.label || values.providerId || t('agent.menu.provider.steps.summaryProviderFallback', 'Provider')} · ${baseUrl || t('agent.menu.provider.steps.summaryDefaultBaseUrl', 'no base URL')}`,
        credential,
        resolveWizardTierLabel(values.tiers, t),
        models ? t('agent.menu.provider.steps.summaryModels', 'Models: {models}', { models }) : ''
    ].filter(Boolean);
}

export function buildProviderWizardConfirmOptions(
    values: AgentWizardValues = {},
    canTest = false,
    t: WizardTranslate = defaultWizardTranslate
): AgentConsoleSelectOption[] {
    const summary = buildProviderWizardSummary(values, t).join('\n');
    const name = resolveWizardProviderName(values);
    const options: AgentConsoleSelectOption[] = [
        {
            label: t('agent.menu.provider.steps.saveActive', 'Save & activate'),
            value: 'save-active',
            description: t('agent.menu.provider.steps.saveActiveDescription', 'Use {name} immediately', { name }),
            detail: summary
        },
        {
            label: t('agent.menu.provider.steps.save', 'Save only'),
            value: 'save',
            description: t('agent.menu.provider.steps.saveDescription', 'Configure now, switch later with /model'),
            detail: summary
        }
    ];
    if (canTest && (values.credential || resolveWizardProviderDef(values.providerId)?.apiKeyEnv)) {
        options.push({
            label: t('agent.menu.provider.steps.test', 'Test connection'),
            value: 'test',
            description: t('agent.menu.provider.steps.testDescription', 'Verify the key and base URL reach the provider'),
            detail: summary
        });
    }
    options.push({
        label: t('agent.menu.provider.steps.edit', 'Edit…'),
        value: 'edit',
        description: t('agent.menu.provider.steps.editDescription', 'Change a field before saving')
    });
    options.push({
        label: t('agent.menu.provider.steps.cancel', 'Cancel'),
        value: 'cancel',
        description: t('agent.menu.provider.steps.cancelOptionDescription', 'Discard this provider')
    });
    return options;
}

export function buildProviderWizardChoiceOptions(
    step: AgentWizardStepDef,
    values: AgentWizardValues = {},
    t: WizardTranslate = defaultWizardTranslate
): { title: string; options: AgentConsoleSelectOption[]; selected: number } | undefined {
    const handler = WIZARD_STEP_HANDLERS[step.id];
    const options = handler?.choices?.(values, t);
    if (!options?.length) {
        return undefined;
    }
    return {
        title: handler.choiceTitle?.(values, t) || t('agent.menu.provider.steps.defaultChoiceTitle', 'Add provider'),
        options,
        selected: handler.choiceIndex?.(values) ?? 0
    };
}
