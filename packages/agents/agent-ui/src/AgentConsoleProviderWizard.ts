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

export function buildProviderWizardSteps(values: AgentWizardValues = {}): AgentWizardStepDef[] {
    const def = resolveWizardProviderDef(values.providerId);
    const steps: AgentWizardStepDef[] = [
        { id: 'provider', kind: 'choose', label: 'Choose a provider' }
    ];
    if (!def || !def.baseUrl) {
        steps.push({ id: 'base-url', kind: 'enter', label: 'API base URL' });
    }
    steps.push({ id: 'auth', kind: 'choose', label: 'Authentication' });
    steps.push({ id: 'credential', kind: 'enter', label: values.authMode === 'env' ? 'Environment variable' : 'API key' });
    steps.push({ id: 'tiers', kind: 'choose', label: 'Model routing' });
    const tiers = values.tiers || 'auto';
    steps.push({ id: 'model-fast', kind: 'enter', label: tiers === 'single' ? 'Model' : 'Fast model' });
    if (tiers === 'auto') {
        steps.push({ id: 'model-balanced', kind: 'enter', label: 'Balanced model' });
    }
    if (tiers !== 'single') {
        steps.push({ id: 'model-strong', kind: 'enter', label: 'Strong model' });
    }
    steps.push({ id: 'confirm', kind: 'confirm', label: 'Review & save' });
    return steps;
}

export function buildWizardStepHelp(step: AgentWizardStepDef, values: AgentWizardValues = {}): string {
    const def = resolveWizardProviderDef(values.providerId);
    switch (step.id) {
        case 'provider':
            return 'Pick a provider to connect. Custom providers let you bring your own API URL.';
        case 'base-url':
            return 'Enter the API endpoint, e.g. https://api.example.com/v1.';
        case 'auth':
            return 'Choose how the API key is provided.';
        case 'credential':
            return values.authMode === 'env'
                ? 'Enter the environment variable that holds the API key, or accept the suggested one.'
                : 'Paste the API key. It is stored locally and never shown again.';
        case 'tiers':
            return 'Choose how many models to configure for this provider.';
        case 'model-fast':
            return def?.models.length ? `Suggested: ${def.models[0]}.` : 'Enter the model identifier to use.';
        case 'model-balanced':
            return def?.models.length ? `Suggested: ${def.models[Math.floor((def.models.length - 1) / 2)] || def.models[0]}.` : 'Enter the balanced model identifier.';
        case 'model-strong':
            return def?.models.length ? `Suggested: ${def.models[def.models.length - 1]}.` : 'Enter the strong model identifier.';
        case 'confirm':
            return 'Review the provider details, then choose how to save.';
        default:
            return '';
    }
}

export function resolveWizardPrefill(step: AgentWizardStepDef, values: AgentWizardValues = {}): string {
    const def = resolveWizardProviderDef(values.providerId);
    switch (step.id) {
        case 'base-url':
            return values.baseUrl || def?.baseUrl || '';
        case 'credential':
            return values.credential || (values.authMode === 'env' ? def?.apiKeyEnv || '' : '');
        case 'model-fast':
            return values.modelFast || (def?.models[0] || '');
        case 'model-balanced':
            return values.modelBalanced || (def?.models[Math.floor((def.models.length - 1) / 2)] || def?.models[0] || '');
        case 'model-strong':
            return values.modelStrong || (def?.models[def.models.length - 1] || '');
        default:
            return '';
    }
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
    const def = resolveWizardProviderDef(values.providerId);
    let title = 'Add provider';
    let options: AgentConsoleSelectOption[] = [];
    let selected = 0;
    switch (step.id) {
        case 'provider':
            title = 'Add provider · choose provider';
            options = AGENT_WIZARD_PROVIDERS.map((item, index) => ({
                label: item.label,
                value: item.id,
                description: `${item.adapter} · ${item.baseUrl || 'custom base URL'}`,
                detail: item.models.length ? `Suggested models: ${item.models.join(', ')}` : 'Bring your own base URL and model names',
                shortcut: String(index + 1)
            }));
            options.push({ label: 'Cancel', value: '__cancel__', description: 'Abort adding a provider' });
            break;
        case 'auth':
            title = `${def?.label || 'Provider'} · authentication`;
            options = [
                { label: 'Enter API key', value: 'key', description: 'Store the key in this configuration' },
                { label: 'Use environment variable', value: 'env', description: `Reference ${def?.apiKeyEnv || 'PROVIDER_API_KEY'} from the environment` }
            ];
            selected = values.authMode === 'env' ? 1 : 0;
            break;
        case 'tiers':
            title = `${def?.label || 'Provider'} · model routing`;
            options = AGENT_WIZARD_TIERS.map((item, index) => ({
                label: item.label,
                value: item.id,
                description: item.description,
                shortcut: String(index + 1)
            }));
            selected = Math.max(0, AGENT_WIZARD_TIERS.findIndex(item => item.id === (values.tiers || 'auto')));
            break;
        default:
            return undefined;
    }
    return { title, options, selected };
}
