export interface AgentPromptOptions {
    /** P106: extra project docs contributed by installed agent plugins (e.g. plugin-scoped AGENTS.md). */
    pluginAgentsDocs?: Array<{ path: string; label?: string }>;
    /** Extra instruction files (global AGENTS.md, config `instructions`) injected before the workspace chain. */
    instructionDocs?: string[];
    /**
     * Provider/model-specific identity overrides for the system prompt. Keys are
     * matched against `${provider}/${model}`, then provider, then model, so a
     * host can tailor the base prompt per model family (opencode-style).
     */
    modelPrompts?: Record<string, { name?: string; role?: string; traits?: string[]; rules?: string[] }>;
}
