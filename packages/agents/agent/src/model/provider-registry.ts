import { AgentModelConfig } from './ModelProviderOptions';

export interface AgentModelCapabilities { chat: boolean; vision: boolean; toolCalling: boolean; promptCache: 'full' | 'partial' | 'none'; reasoning: boolean; }
export interface AgentProviderModel { id: string; label?: string; capabilities?: Partial<AgentModelCapabilities>; }
export interface AgentProviderDefinition {
    id: string; label?: string; adapter?: 'openai' | 'anthropic' | 'openai-compatible';
    baseUrl?: string; apiKeyEnv?: string; models: AgentProviderModel[];
    capabilities?: Partial<AgentModelCapabilities>;
}

const DEFAULT_CAPABILITIES: AgentModelCapabilities = { chat: true, vision: false, toolCalling: true, promptCache: 'none', reasoning: false };
export const BUILTIN_AGENT_PROVIDERS: AgentProviderDefinition[] = [
    { id: 'deepseek', label: 'DeepSeek', adapter: 'openai-compatible', baseUrl: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY', capabilities: { promptCache: 'partial', reasoning: true }, models: [{ id: 'deepseek-chat' }, { id: 'deepseek-reasoner', capabilities: { reasoning: true } }] },
    { id: 'openai', label: 'OpenAI', adapter: 'openai', baseUrl: 'https://api.openai.com', apiKeyEnv: 'OPENAI_API_KEY', capabilities: { vision: true, promptCache: 'full', reasoning: true }, models: [{ id: 'gpt-5' }, { id: 'gpt-4.1' }, { id: 'gpt-4.1-mini' }] },
    { id: 'anthropic', label: 'Anthropic', adapter: 'anthropic', baseUrl: 'https://api.anthropic.com', apiKeyEnv: 'ANTHROPIC_API_KEY', capabilities: { vision: true, promptCache: 'full', reasoning: true }, models: [{ id: 'claude-opus-4-1' }, { id: 'claude-sonnet-4' }, { id: 'claude-haiku-3-5' }] },
    { id: 'gemini', label: 'Google Gemini', adapter: 'openai-compatible', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', apiKeyEnv: 'GEMINI_API_KEY', capabilities: { vision: true, reasoning: true }, models: [{ id: 'gemini-2.5-pro' }, { id: 'gemini-2.5-flash' }] },
    { id: 'openai-compatible', label: 'OpenAI Compatible', adapter: 'openai-compatible', apiKeyEnv: 'OPENAI_API_KEY', models: [] }
];

export class AgentProviderRegistry {
    private readonly providers = new Map<string, AgentProviderDefinition>();
    constructor(definitions: AgentProviderDefinition[] = BUILTIN_AGENT_PROVIDERS) { for (const item of definitions) this.providers.set(normalizeId(item.id), normalizeDefinition(item)); }
    static parse(input: unknown): AgentProviderDefinition[] {
        const root = input as any;
        const entries = Array.isArray(root?.providers) ? root.providers : root?.providers && typeof root.providers === 'object' ? Object.entries(root.providers).map(([id, value]) => ({ id, ...(value as any) })) : Array.isArray(root) ? root : [];
        return entries.map(normalizeDefinition);
    }
    list(): AgentProviderDefinition[] { return [...this.providers.values()].map(cloneDefinition).sort((a, b) => a.id.localeCompare(b.id)); }
    get(provider: string): AgentProviderDefinition | undefined { const value = this.providers.get(normalizeId(provider)); return value ? cloneDefinition(value) : undefined; }
    resolveModel(provider: string, model: string): { provider?: AgentProviderDefinition; model?: AgentProviderModel; capabilities: AgentModelCapabilities } {
        const definition = this.get(provider); const found = definition?.models.find(item => item.id === model);
        return { provider: definition, model: found, capabilities: { ...DEFAULT_CAPABILITIES, ...(definition?.capabilities || {}), ...(found?.capabilities || {}) } };
    }
    completeConfig(config: AgentModelConfig): AgentModelConfig { const definition = this.get(config.provider || ''); return definition ? { ...config, baseUrl: config.baseUrl || definition.baseUrl, apiKeyEnv: config.apiKeyEnv || definition.apiKeyEnv } : { ...config }; }
}

export const defaultAgentProviderRegistry = new AgentProviderRegistry();
function normalizeDefinition(value: any): AgentProviderDefinition {
    const id = normalizeId(value?.id); if (!id) throw new Error('Provider id is required.');
    const models = Array.isArray(value?.models) ? value.models.map((model: any) => typeof model === 'string' ? { id: model } : { ...model, id: String(model?.id || '').trim() }).filter((model: AgentProviderModel) => !!model.id) : [];
    return { id, label: value?.label ? String(value.label) : undefined, adapter: value?.adapter, baseUrl: value?.baseUrl ? String(value.baseUrl).replace(/\/+$/, '') : undefined, apiKeyEnv: value?.apiKeyEnv ? String(value.apiKeyEnv) : undefined, models, capabilities: value?.capabilities ? { ...value.capabilities } : undefined };
}
function normalizeId(value: unknown): string { return String(value || '').trim().toLowerCase(); }
function cloneDefinition(value: AgentProviderDefinition): AgentProviderDefinition { return { ...value, capabilities: value.capabilities ? { ...value.capabilities } : undefined, models: value.models.map(model => ({ ...model, capabilities: model.capabilities ? { ...model.capabilities } : undefined })) }; }
