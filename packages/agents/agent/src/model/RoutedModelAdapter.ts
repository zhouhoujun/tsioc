import { ModelAdapter } from './ModelAdapter';
import { ModelRequest } from './ModelRequest';
import { ModelResponse } from './ModelResponse';
import { StreamChunk } from './StreamChunk';
import { AgentModelComplexity, AgentModelConfig, AgentModelOptions, AgentModelRoute } from './ModelProviderOptions';
import { OpenAICompatibleModelAdapter } from './OpenAICompatibleModelAdapter';
import { AnthropicModelAdapter } from './AnthropicModelAdapter';
import { EchoModelAdapter } from './EchoModelAdapter';

interface ResolvedRouteSelection {
    adapter: ModelAdapter;
    config: AgentModelConfig;
    route?: AgentModelRoute;
    profileName?: string;
    complexity: AgentModelComplexity;
}

const DEFAULT_SIMPLE_MAX = 1;
const DEFAULT_MODERATE_MAX = 3;

export class RoutedModelAdapter extends ModelAdapter {
    private readonly adapters = new Map<string, ModelAdapter>();

    readonly provider: string;

    constructor(private readonly options: AgentModelOptions) {
        super();
        this.provider = this.normalizeProvider(this.options.provider, this.options.baseUrl);
    }

    async complete(request: ModelRequest): Promise<ModelResponse> {
        const selection = this.selectAdapter(request);
        const response = await selection.adapter.complete(request);
        return this.decorateResponse(response, selection);
    }

    async *stream(request: ModelRequest): AsyncGenerator<StreamChunk> {
        const selection = this.selectAdapter(request);
        for await (const chunk of selection.adapter.stream(request)) {
            if (chunk.type === 'done') {
                yield {
                    ...chunk,
                    metadata: this.decorateMetadata(chunk.metadata as Record<string, any> | undefined, selection)
                };
                continue;
            }
            yield chunk;
        }
    }

    private selectAdapter(request: ModelRequest): ResolvedRouteSelection {
        const input = this.extractInput(request);
        const complexity = this.estimateComplexity(input);
        const explicitRoute = this.matchRoute(input, complexity);
        const explicitConfig = explicitRoute ? this.resolveRouteConfig(explicitRoute) : null;
        if (explicitConfig) {
            return {
                adapter: this.getOrCreateAdapter(explicitConfig),
                config: explicitConfig,
                route: explicitRoute ?? undefined,
                profileName: explicitRoute?.profile,
                complexity
            };
        }

        const complexityConfig = this.resolveComplexityConfig(complexity);
        if (complexityConfig) {
            return {
                adapter: this.getOrCreateAdapter(complexityConfig.config),
                config: complexityConfig.config,
                profileName: complexityConfig.profileName,
                complexity
            };
        }

        const fallback = this.resolveFallbackConfig();
        return {
            adapter: this.getOrCreateAdapter(fallback.config),
            config: fallback.config,
            profileName: fallback.profileName,
            complexity
        };
    }

    private extractInput(request: ModelRequest): string {
        const latestUserMessage = [...request.messages].reverse().find(message => message.role === 'user');
        return latestUserMessage?.content ?? '';
    }

    private estimateComplexity(input: string): AgentModelComplexity {
        const normalized = input.toLowerCase();
        let score = 0;

        const length = normalized.length;
        if (length > 120) score += 1;
        if (length > 500) score += 1;
        if (length > 1400) score += 1;

        const lineCount = input.split('\n').length;
        if (lineCount >= 6) score += 1;

        const complexitySignals = [
            'architecture', 'architect', 'refactor', 'migration', 'tradeoff', 'design', 'root cause', 'postmortem',
            'optimize', 'optimise', 'algorithm', 'debug', 'investigate', 'prove', 'reason', 'analyze', 'analyse',
            'multi-step', 'step by step', 'system design', 'performance', 'security', 'concurrency', 'distributed',
            'planning', 'workflow', 'benchmark', '复杂', '推理', '分析', '架构', '排查', '根因', '优化', '设计', '迁移',
            '性能', '安全', '并发', '分布式', '代码'
        ];
        const matchedSignals = complexitySignals.filter(signal => normalized.includes(signal));
        score += Math.min(4, matchedSignals.length);

        if (/[?？]/.test(input) && matchedSignals.length >= 2) {
            score += 1;
        }

        const simpleMax = this.options.complexityThresholds?.simpleMaxScore ?? DEFAULT_SIMPLE_MAX;
        const moderateMax = this.options.complexityThresholds?.moderateMaxScore ?? DEFAULT_MODERATE_MAX;

        if (score <= simpleMax) {
            return 'simple';
        }
        if (score <= moderateMax) {
            return 'moderate';
        }
        return 'complex';
    }

    private matchRoute(input: string, complexity: AgentModelComplexity): AgentModelRoute | null {
        for (const route of this.options.routes ?? []) {
            if (this.routeMatches(route, input, complexity)) {
                return route;
            }
        }
        return null;
    }

    private routeMatches(route: AgentModelRoute, input: string, complexity: AgentModelComplexity): boolean {
        const when = route.when;
        if (!when) {
            return true;
        }

        if (when.complexity) {
            const expected = Array.isArray(when.complexity) ? when.complexity : [when.complexity];
            if (!expected.includes(complexity)) {
                return false;
            }
        }

        if (when.inputPattern) {
            const matcher = new RegExp(when.inputPattern, 'i');
            if (!matcher.test(input)) {
                return false;
            }
        }

        if (when.containsAny?.length) {
            const lower = input.toLowerCase();
            const matched = when.containsAny.some(keyword => lower.includes(keyword.toLowerCase()));
            if (!matched) {
                return false;
            }
        }

        if (when.minInputLength != null && input.length < when.minInputLength) {
            return false;
        }

        if (when.maxInputLength != null && input.length > when.maxInputLength) {
            return false;
        }

        return true;
    }

    private resolveRouteConfig(route: AgentModelRoute): AgentModelConfig | null {
        const topLevel = this.pickConfig(this.options);
        const profileConfig = route.profile ? this.options.profiles?.[route.profile] : undefined;
        if (route.profile && !profileConfig) {
            throw new Error(`Unknown model profile '${route.profile}'.`);
        }

        const routeConfig = this.mergeConfigs(
            this.mergeConfigs(topLevel, profileConfig),
            this.pickConfig(route)
        );
        if (!routeConfig.provider && !routeConfig.model) {
            return null;
        }
        return routeConfig;
    }

    private resolveComplexityConfig(complexity: AgentModelComplexity): { config: AgentModelConfig; profileName?: string } | null {
        const topLevel = this.pickConfig(this.options);
        const entry = this.options.complexityRouting?.[complexity];
        if (!entry) {
            return null;
        }
        if (typeof entry === 'string') {
            const profile = this.options.profiles?.[entry];
            if (!profile) {
                throw new Error(`Unknown model profile '${entry}' for complexity '${complexity}'.`);
            }
            return { config: this.mergeConfigs(topLevel, profile), profileName: entry };
        }
        return { config: this.mergeConfigs(topLevel, entry) };
    }

    private resolveFallbackConfig(): { config: AgentModelConfig; profileName?: string } {
        const topLevel = this.pickConfig(this.options);
        if (this.options.defaultProfile) {
            const profile = this.options.profiles?.[this.options.defaultProfile];
            if (!profile) {
                throw new Error(`Unknown default model profile '${this.options.defaultProfile}'.`);
            }
            return {
                config: this.mergeConfigs(topLevel, profile),
                profileName: this.options.defaultProfile
            };
        }

        return { config: this.mergeConfigs(undefined, topLevel) };
    }

    private pickConfig(source?: AgentModelConfig | AgentModelRoute | AgentModelOptions): AgentModelConfig {
        if (!source) {
            return {};
        }
        return {
            provider: source.provider,
            model: source.model,
            apiKey: source.apiKey,
            apiKeyEnv: source.apiKeyEnv,
            baseUrl: source.baseUrl,
            timeoutMs: source.timeoutMs,
            temperature: source.temperature,
            maxTokens: source.maxTokens,
            headers: source.headers ? { ...source.headers } : undefined,
            thinkingBudget: source.thinkingBudget,
            reasoning: source.reasoning,
            promptCache: source.promptCache
        };
    }

    private mergeConfigs(base?: AgentModelConfig, override?: AgentModelConfig): AgentModelConfig {
        return {
            ...(base ?? {}),
            ...(override ?? {}),
            headers: {
                ...(base?.headers ?? {}),
                ...(override?.headers ?? {})
            }
        };
    }

    private getOrCreateAdapter(config: AgentModelConfig): ModelAdapter {
        const normalized = this.normalizeConfig(config);
        const cacheKey = JSON.stringify(normalized);
        const cached = this.adapters.get(cacheKey);
        if (cached) {
            return cached;
        }

        const adapter = this.createAdapter(normalized);
        this.adapters.set(cacheKey, adapter);
        return adapter;
    }

    private normalizeConfig(config: AgentModelConfig): AgentModelConfig {
        const normalizedProvider = this.normalizeProvider(config.provider, config.baseUrl);
        return {
            ...config,
            provider: normalizedProvider
        };
    }

    private normalizeProvider(provider?: string, baseUrl?: string): string {
        const normalized = provider?.trim().toLowerCase();
        if (!normalized) {
            return baseUrl ? 'openai-compatible' : 'deepseek';
        }

        if (normalized === 'claude') {
            return 'anthropic';
        }

        if (normalized === 'hermes') {
            return 'openai-compatible';
        }

        if (normalized === 'openai' || normalized === 'deepseek' || normalized === 'anthropic' || normalized === 'echo') {
            return normalized;
        }

        if (baseUrl) {
            return 'openai-compatible';
        }

        return normalized;
    }

    private createAdapter(config: AgentModelConfig): ModelAdapter {
        switch (config.provider) {
            case 'anthropic':
                return new AnthropicModelAdapter(config);
            case 'echo':
                return new EchoModelAdapter();
            case 'openai':
            case 'deepseek':
            case 'openai-compatible':
                return new OpenAICompatibleModelAdapter(config);
            default:
                if (config.baseUrl) {
                    return new OpenAICompatibleModelAdapter(config);
                }
                throw new Error(`Unsupported model provider '${config.provider ?? 'unknown'}'.`);
        }
    }

    private decorateResponse(response: ModelResponse, selection: ResolvedRouteSelection): ModelResponse {
        return {
            ...response,
            metadata: this.decorateMetadata(response.metadata as Record<string, any> | undefined, selection)
        };
    }

    private decorateMetadata(metadata: Record<string, any> | undefined, selection: ResolvedRouteSelection): Record<string, any> {
        return {
            ...(metadata ?? {}),
            provider: metadata?.provider ?? selection.config.provider,
            model: metadata?.model ?? selection.config.model,
            routing: {
                complexity: selection.complexity,
                route: selection.route?.name,
                profile: selection.profileName
            }
        };
    }
}
