import { AgentConsoleSelectOption } from './AgentConsoleSessionState';

export type AgentWizardStepId = 'provider' | 'base-url' | 'auth' | 'credential' | 'tiers' | 'model-fast' | 'model-balanced' | 'model-strong' | 'confirm';

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

export function resolveWizardTierLabel(tier?: string): string {
    return AGENT_WIZARD_TIERS.find(item => item.id === tier)?.label || 'Auto routing';
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

function midpointModel(def?: AgentWizardProviderDef): string {
    if (!def?.models.length) {
        return '';
    }
    return def.models[Math.floor((def.models.length - 1) / 2)] || def.models[0];
}

export interface AgentWizardStepHandler {
    kind: 'choose' | 'enter' | 'confirm';
    label(values: AgentWizardValues): string;
    help(values: AgentWizardValues): string;
    prefill?(values: AgentWizardValues): string;
    choices?(values: AgentWizardValues): AgentConsoleSelectOption[];
    choiceTitle?(values: AgentWizardValues): string;
    choiceIndex?(values: AgentWizardValues): number;
    applyChoice?(values: AgentWizardValues, value: string): void;
    applyEnter?(values: AgentWizardValues, value: string): void;
}

export const WIZARD_STEP_HANDLERS: Record<AgentWizardStepId, AgentWizardStepHandler> = {
    provider: {
        kind: 'choose',
        label: () => 'Choose a provider',
        help: () => 'Pick a provider to connect. Custom providers let you bring your own API URL.',
        choiceTitle: () => 'Add provider · choose provider',
        choiceIndex: () => 0,
        choices: () => {
            const options: AgentConsoleSelectOption[] = AGENT_WIZARD_PROVIDERS.map((item, index) => ({
                label: item.label,
                value: item.id,
                description: `${item.adapter} · ${item.baseUrl || 'custom base URL'}`,
                detail: item.models.length ? `Suggested models: ${item.models.join(', ')}` : 'Bring your own base URL and model names',
                shortcut: String(index + 1)
            }));
            options.push({ label: 'Cancel', value: '__cancel__', description: 'Abort adding a provider' });
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
        label: () => 'API base URL',
        help: () => 'Enter the API endpoint, e.g. https://api.example.com/v1.',
        prefill: values => values.baseUrl || resolveWizardProviderDef(values.providerId)?.baseUrl || '',
        applyEnter: (values, value) => {
            values.baseUrl = value.replace(/\/+$/, '');
        }
    },
    auth: {
        kind: 'choose',
        label: () => 'Authentication',
        help: () => 'Choose how the API key is provided.',
        choiceTitle: values => `${resolveWizardProviderDef(values.providerId)?.label || 'Provider'} · authentication`,
        choiceIndex: values => (values.authMode === 'env' ? 1 : 0),
        choices: values => [
            { label: 'Enter API key', value: 'key', description: 'Store the key in this configuration' },
            { label: 'Use environment variable', value: 'env', description: `Reference ${resolveWizardProviderDef(values.providerId)?.apiKeyEnv || 'PROVIDER_API_KEY'} from the environment` }
        ],
        applyChoice: (values, value) => {
            if (value === 'key' || value === 'env') {
                values.authMode = value;
                if (value === 'env') {
                    values.credential = resolveWizardProviderDef(values.providerId)?.apiKeyEnv || values.credential;
                }
            }
        }
    },
    credential: {
        kind: 'enter',
        label: values => (values.authMode === 'env' ? 'Environment variable' : 'API key'),
        help: values => values.authMode === 'env'
            ? 'Enter the environment variable that holds the API key, or accept the suggested one.'
            : 'Paste the API key. It is stored locally and never shown again.',
        prefill: values => values.credential || (values.authMode === 'env' ? resolveWizardProviderDef(values.providerId)?.apiKeyEnv || '' : ''),
        applyEnter: (values, value) => {
            values.credential = value;
        }
    },
    tiers: {
        kind: 'choose',
        label: () => 'Model routing',
        help: () => 'Choose how many models to configure for this provider.',
        choiceTitle: values => `${resolveWizardProviderDef(values.providerId)?.label || 'Provider'} · model routing`,
        choiceIndex: values => Math.max(0, AGENT_WIZARD_TIERS.findIndex(item => item.id === (values.tiers || 'auto'))),
        choices: () => AGENT_WIZARD_TIERS.map((item, index) => ({
            label: item.label,
            value: item.id,
            description: item.description,
            shortcut: String(index + 1)
        })),
        applyChoice: (values, value) => {
            values.tiers = value as 'single' | 'pair' | 'auto';
        }
    },
    'model-fast': {
        kind: 'enter',
        label: values => ((values.tiers || 'auto') === 'single' ? 'Model' : 'Fast model'),
        help: values => {
            const def = resolveWizardProviderDef(values.providerId);
            return def?.models.length ? `Suggested: ${def.models[0]}.` : 'Enter the model identifier to use.';
        },
        prefill: values => values.modelFast || resolveWizardProviderDef(values.providerId)?.models[0] || '',
        applyEnter: (values, value) => {
            values.modelFast = value;
        }
    },
    'model-balanced': {
        kind: 'enter',
        label: () => 'Balanced model',
        help: values => {
            const def = resolveWizardProviderDef(values.providerId);
            return def?.models.length ? `Suggested: ${midpointModel(def)}.` : 'Enter the balanced model identifier.';
        },
        prefill: values => values.modelBalanced || midpointModel(resolveWizardProviderDef(values.providerId)) || '',
        applyEnter: (values, value) => {
            values.modelBalanced = value;
        }
    },
    'model-strong': {
        kind: 'enter',
        label: () => 'Strong model',
        help: values => {
            const def = resolveWizardProviderDef(values.providerId);
            return def?.models.length ? `Suggested: ${def.models[def.models.length - 1]}.` : 'Enter the strong model identifier.';
        },
        prefill: values => {
            const def = resolveWizardProviderDef(values.providerId);
            const suggested = def?.models.length ? def.models[def.models.length - 1] : '';
            return values.modelStrong || suggested || '';
        },
        applyEnter: (values, value) => {
            values.modelStrong = value;
        }
    },
    confirm: {
        kind: 'confirm',
        label: () => 'Review & save',
        help: () => 'Review the provider details, then choose how to save.'
    }
};

export function buildProviderWizardSteps(values: AgentWizardValues = {}): AgentWizardStepDef[] {
    const def = resolveWizardProviderDef(values.providerId);
    const steps: AgentWizardStepDef[] = [
        { id: 'provider', kind: 'choose', label: WIZARD_STEP_HANDLERS.provider.label(values) }
    ];
    if (!def || !def.baseUrl) {
        steps.push({ id: 'base-url', kind: 'enter', label: WIZARD_STEP_HANDLERS['base-url'].label(values) });
    }
    steps.push({ id: 'auth', kind: 'choose', label: WIZARD_STEP_HANDLERS.auth.label(values) });
    steps.push({ id: 'credential', kind: 'enter', label: WIZARD_STEP_HANDLERS.credential.label(values) });
    steps.push({ id: 'tiers', kind: 'choose', label: WIZARD_STEP_HANDLERS.tiers.label(values) });
    const tiers = values.tiers || 'auto';
    steps.push({ id: 'model-fast', kind: 'enter', label: WIZARD_STEP_HANDLERS['model-fast'].label(values) });
    if (tiers === 'auto') {
        steps.push({ id: 'model-balanced', kind: 'enter', label: WIZARD_STEP_HANDLERS['model-balanced'].label(values) });
    }
    if (tiers !== 'single') {
        steps.push({ id: 'model-strong', kind: 'enter', label: WIZARD_STEP_HANDLERS['model-strong'].label(values) });
    }
    steps.push({ id: 'confirm', kind: 'confirm', label: WIZARD_STEP_HANDLERS.confirm.label(values) });
    return steps;
}

export function buildWizardStepHelp(step: AgentWizardStepDef, values: AgentWizardValues = {}): string {
    return WIZARD_STEP_HANDLERS[step.id]?.help(values) ?? '';
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

export function buildProviderWizardSummary(values: AgentWizardValues = {}): string[] {
    const def = resolveWizardProviderDef(values.providerId);
    const baseUrl = values.baseUrl || def?.baseUrl || '';
    const credential = values.authMode === 'env' ? `env ${values.credential}` : 'API key set';
    const models = [values.modelFast, values.modelBalanced, values.modelStrong].filter(Boolean).join(' · ');
    return [
        `${def?.label || values.providerId || 'Provider'} · ${baseUrl || 'no base URL'}`,
        credential,
        resolveWizardTierLabel(values.tiers),
        models ? `Models: ${models}` : ''
    ].filter(Boolean);
}

export function buildProviderWizardConfirmOptions(values: AgentWizardValues = {}, canTest = false): AgentConsoleSelectOption[] {
    const summary = buildProviderWizardSummary(values).join('\n');
    const options: AgentConsoleSelectOption[] = [
        { label: 'Save & activate', value: 'save-active', description: `Use ${resolveWizardProviderName(values)} immediately`, detail: summary },
        { label: 'Save only', value: 'save', description: 'Configure now, switch later with /model', detail: summary }
    ];
    if (canTest && (values.credential || resolveWizardProviderDef(values.providerId)?.apiKeyEnv)) {
        options.push({ label: 'Test connection', value: 'test', description: 'Verify the key and base URL reach the provider', detail: summary });
    }
    options.push({ label: 'Edit…', value: 'edit', description: 'Change a field before saving' });
    options.push({ label: 'Cancel', value: 'cancel', description: 'Discard this provider' });
    return options;
}

export function buildProviderWizardChoiceOptions(
    step: AgentWizardStepDef,
    values: AgentWizardValues = {}
): { title: string; options: AgentConsoleSelectOption[]; selected: number } | undefined {
    const handler = WIZARD_STEP_HANDLERS[step.id];
    const options = handler?.choices?.(values);
    if (!options?.length) {
        return undefined;
    }
    return {
        title: handler.choiceTitle?.(values) || 'Add provider',
        options,
        selected: handler.choiceIndex?.(values) ?? 0
    };
}
