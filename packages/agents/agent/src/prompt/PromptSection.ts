/**
 * A single section of the system prompt — rendered to text and injected
 * into the model context at the start of each turn.
 *
 * Reference: zeroclaw SystemPromptBuilder + PromptSection trait
 */
export abstract class PromptSection {
    /** Unique section name for debugging and ordering */
    abstract name(): string;
    /** Render the section content. Return empty string to skip. */
    abstract render(context: PromptSectionContext): string | Promise<string>;
    /** Priority: lower numbers render first */
    priority?: number = 100;
}

export interface PromptSectionContext {
    sessionId: string;
    tools: Array<{ name: string; description: string; activation?: { kind?: string; scope?: string; activated?: boolean } }>;
    memory: string;
    dateTime: string;
    platform?: string;
    model?: string;
    extra?: Record<string, any>;
}
