import type { ApplicationArguments } from '@tsdi/core';
import { ModelAdapter } from './ModelAdapter';
import { ModelRequest } from './ModelRequest';
import { ModelResponse } from './ModelResponse';
import { StreamChunk } from './StreamChunk';
import { AgentModelComplexity, AgentModelConfig, AgentModelOptions, AgentModelRoute } from './ModelProviderOptions';
import { OpenAICompatibleModelAdapter } from './OpenAICompatibleModelAdapter';
import { AnthropicModelAdapter } from './AnthropicModelAdapter';
import { EchoModelAdapter } from './EchoModelAdapter';
import { getAgentMessageText } from '../runtime/AgentMessage';
import { AgentClock } from '../runtime/Clock';

interface ResolvedRouteSelection {
    adapter: ModelAdapter;
    config: AgentModelConfig;
    route?: AgentModelRoute;
    profileName?: string;
    complexity: AgentModelComplexity;
    falsifyRate?: number;
}

const DEFAULT_SIMPLE_MAX = 1;
const DEFAULT_MODERATE_MAX = 3;

export class RoutedModelAdapter extends ModelAdapter {
    private readonly adapters = new Map<string, ModelAdapter>();
    protected appArgs?: ApplicationArguments;

    readonly provider: string;

    private readonly warnings: string[] = [];

    constructor(private readonly options: AgentModelOptions, appArgs?: ApplicationArguments, protected readonly clock?: AgentClock) {
        super();
        this.provider = this.normalizeProvider(this.options.provider, this.options.baseUrl);
        this.appArgs = appArgs;
    }

    /** Non-fatal routing problems collected while selecting a model config. */
    getWarnings(): string[] {
        return this.warnings.slice();
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
        const falsifyRate = request.falsifyRate;
        const explicitProfile = this.resolveExplicitProfile(request.profile);
        if (explicitProfile) {
            return {
                adapter: this.getOrCreateAdapter(explicitProfile.config),
                config: explicitProfile.config,
                profileName: explicitProfile.profileName,
                complexity,
                falsifyRate
            };
        }
        const explicitRoute = this.matchRoute(input, complexity, falsifyRate);
        const explicitConfig = explicitRoute ? this.resolveRouteConfig(explicitRoute) : null;
        if (explicitConfig) {
            return {
                adapter: this.getOrCreateAdapter(explicitConfig),
                config: explicitConfig,
                route: explicitRoute ?? undefined,
                profileName: explicitRoute?.profile,
                complexity,
                falsifyRate
            };
        }

        const complexityConfig = this.resolveComplexityConfig(complexity);
        if (complexityConfig) {
            return {
                adapter: this.getOrCreateAdapter(complexityConfig.config),
                config: complexityConfig.config,
                profileName: complexityConfig.profileName,
                complexity,
                falsifyRate
            };
        }

        const fallback = this.resolveFallbackConfig();
        return {
            adapter: this.getOrCreateAdapter(fallback.config),
            config: fallback.config,
            profileName: fallback.profileName,
            complexity,
            falsifyRate
        };
    }

    private extractInput(request: ModelRequest): string {
        const latestUserMessage = [...request.messages].reverse().find(message => message.role === 'user');
        return getAgentMessageText(latestUserMessage);
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

        score += this.estimateStructuralComplexity(input, normalized);

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

    // Structural signals score how much work a prompt describes rather than its
    // topic: a pasted single-line build request is complex with zero keyword hits.
    private estimateStructuralComplexity(input: string, normalized: string): number {
        let structural = 0;

        const enumerated = this.countEnumeratedItems(input);
        if (enumerated >= 3) {
            structural += 2;
        } else if (enumerated >= 2) {
            structural += 1;
        }

        const referencedFiles = this.countReferencedFiles(input);
        if (referencedFiles >= 4) {
            structural += 2;
        } else if (referencedFiles >= 2) {
            structural += 1;
        }

        if (this.countBuildVerbs(normalized) >= 2) {
            structural += 1;
        }

        return structural;
    }

    private countEnumeratedItems(input: string): number {
        const indices = new Set<number>();
        const numbered = /(?:^|[\s;；。])([1-9]\d?)[)）.、．]\s*\S/g;
        let match = numbered.exec(input);
        while (match) {
            indices.add(Number(match[1]));
            match = numbered.exec(input);
        }
        const bullets = input.match(/(?:^|\n)\s*[-*•]\s+\S/g);
        return Math.max(indices.size, bullets ? bullets.length : 0);
    }

    private countReferencedFiles(input: string): number {
        const matches = input.match(/[\w./-]+\.[A-Za-z]{1,5}\b/g);
        return matches ? new Set(matches.map(name => name.toLowerCase())).size : 0;
    }

    private countBuildVerbs(normalized: string): number {
        const buildVerbs = [
            'add', 'implement', 'update', 'refactor', 'migrate', 'create', 'write', 'extend', 'introduce',
            'wire', 'remove', 'delete', 'rename', 'convert', 'port',
            '新增', '添加', '实现', '补齐', '补充', '重构', '迁移', '创建', '编写', '扩展', '引入', '修复', '改造', '完善', '提交'
        ];
        return buildVerbs.filter(verb => normalized.includes(verb)).length;
    }

    private matchRoute(input: string, complexity: AgentModelComplexity, falsifyRate?: number): AgentModelRoute | null {
        for (const route of this.options.routes ?? []) {
            if (this.routeMatches(route, input, complexity, falsifyRate)) {
                return route;
            }
        }
        return null;
    }

    private routeMatches(route: AgentModelRoute, input: string, complexity: AgentModelComplexity, falsifyRate?: number): boolean {
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

        if (when.falsifyRateGt != null && (falsifyRate == null || falsifyRate <= when.falsifyRateGt)) {
            return false;
        }

        return true;
    }

    private resolveExplicitProfile(profileName?: string): { config: AgentModelConfig; profileName: string } | null {
        if (!profileName?.trim()) {
            return null;
        }
        const topLevel = this.pickConfig(this.options);
        const profile = this.options.profiles?.[profileName.trim()];
        if (!profile) {
            throw new Error(`Unknown model profile '${profileName.trim()}'.`);
        }
        return { config: this.mergeConfigs(topLevel, profile), profileName: profileName.trim() };
    }

    private resolveRouteConfig(route: AgentModelRoute): AgentModelConfig | null {
        const topLevel = this.pickConfig(this.options);
        const profileConfig = route.profile ? this.options.profiles?.[route.profile] : undefined;
        if (route.profile && !profileConfig) {
            this.warnings.push(`Unknown model profile '${route.profile}' for route '${route.name || ''}'; ignoring the profile.`);
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
                this.warnings.push(`Unknown model profile '${entry}' for complexity '${complexity}'; falling back to the default model.`);
                return null;
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
                this.warnings.push(`Unknown default model profile '${this.options.defaultProfile}'; falling back to the top-level model.`);
                return { config: this.mergeConfigs(undefined, topLevel) };
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
        const picked: AgentModelConfig = {
            provider: source.provider,
            model: source.model,
            apiKey: source.apiKey,
            apiKeyEnv: source.apiKeyEnv,
            baseUrl: source.baseUrl,
            timeoutMs: source.timeoutMs,
            retry: source.retry ? { ...source.retry } : undefined,
            temperature: source.temperature,
            maxTokens: source.maxTokens,
            headers: source.headers ? { ...source.headers } : undefined,
            thinkingBudget: source.thinkingBudget,
            reasoning: source.reasoning,
            reasoningEffort: source.reasoningEffort,
            promptCache: source.promptCache
        };
        for (const key of Object.keys(picked) as Array<keyof AgentModelConfig>) {
            if (picked[key] === undefined) {
                delete picked[key];
            }
        }
        return picked;
    }

    private mergeConfigs(base?: AgentModelConfig, override?: AgentModelConfig): AgentModelConfig {
        return {
            ...(base ?? {}),
            ...(override ?? {}),
            headers: {
                ...(base?.headers ?? {}),
                ...(override?.headers ?? {})
            },
            retry: {
                ...(base?.retry ?? {}),
                ...(override?.retry ?? {})
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
                return new AnthropicModelAdapter(config, this.appArgs, this.clock);
            case 'echo':
                return new EchoModelAdapter();
            case 'openai':
            case 'deepseek':
            case 'openai-compatible':
                return new OpenAICompatibleModelAdapter(config, this.appArgs, this.clock);
            default:
                if (config.baseUrl) {
                    return new OpenAICompatibleModelAdapter(config, this.appArgs);
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
                profile: selection.profileName,
                ...(selection.falsifyRate != null ? { falsifyRate: selection.falsifyRate } : {})
            }
        };
    }
}
