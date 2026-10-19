import { Injectable, Inject } from '@tsdi/ioc';
import { AGENT_PROMPT_SECTIONS } from '../tokens';
import { PromptSection, PromptSectionContext } from './PromptSection';

/**
 * Aggregates prompt sections and renders them into a final system prompt string.
 *
 * Reference: zeroclaw SystemPromptBuilder with pluggable PromptSection trait
 *
 * Usage:
 *   const prompt = await builder.build({ sessionId, tools, memory, ... });
 *   // → "Current date and time: ...\n\nYou are ...\n\n## Available Tools\n..."
 */
@Injectable()
export class SystemPromptBuilder {
    constructor(
        @Inject(AGENT_PROMPT_SECTIONS, { defaultValue: [] })
        private sections: PromptSection[]
    ) {
    }

    /** Register additional sections at runtime */
    register(...sections: PromptSection[]): void {
        this.sections.push(...sections);
    }

    /**
     * Render the prompt as two parts: the cacheable (static) prefix and the
     * dynamic tail (date-time, memory, ...). Keeping them in separate system
     * messages lets providers cache the stable prefix even when the dynamic
     * tail changes every turn; joining them into one message invalidates the
     * whole system prompt on providers that cache per message.
     */
    async buildParts(context: Partial<PromptSectionContext>): Promise<{ cacheable: string; dynamic: string }> {
        const ctx: PromptSectionContext = {
            sessionId: context.sessionId ?? '',
            tools: context.tools ?? [],
            memory: context.memory ?? '',
            dateTime: context.dateTime ?? new Date().toISOString(),
            platform: context.platform,
            model: context.model,
            extra: context.extra
        };

        // Cacheable (static) sections render first so the prompt prefix stays
        // stable across turns; dynamic sections (date-time, memory) follow.
        const sorted = [...this.sections].sort((a, b) => {
            const aCacheable = a.cacheable !== false;
            const bCacheable = b.cacheable !== false;
            if (aCacheable !== bCacheable) {
                return aCacheable ? -1 : 1;
            }
            return (a.priority ?? 100) - (b.priority ?? 100);
        });
        const renderedSections = await Promise.all(sorted.map(async section => {
            try {
                return await section.render(ctx);
            } catch {
                return '';
            }
        }));

        const cacheable: string[] = [];
        const dynamic: string[] = [];
        sorted.forEach((section, index) => {
            const rendered = renderedSections[index];
            if (!rendered) {
                return;
            }
            (section.cacheable === false ? dynamic : cacheable).push(rendered);
        });
        return {
            cacheable: cacheable.join('\n\n'),
            dynamic: dynamic.join('\n\n')
        };
    }

    /** Build the complete system prompt (legacy single-string form). */
    async build(context: Partial<PromptSectionContext>): Promise<string> {
        const parts = await this.buildParts(context);
        return [parts.cacheable, parts.dynamic].filter(Boolean).join('\n\n');
    }
}

export { PromptSection, PromptSectionContext } from './PromptSection';
export { IdentitySection, IdentityConfig } from './sections/IdentitySection';
export { ToolsSection } from './sections/ToolsSection';
export { DateTimeSection } from './sections/DateTimeSection';
export { MemorySection } from './sections/MemorySection';
export { ProjectContextSection } from './sections/ProjectContextSection';
export { McpServerInstructionsSection } from './sections/McpServerInstructionsSection';
