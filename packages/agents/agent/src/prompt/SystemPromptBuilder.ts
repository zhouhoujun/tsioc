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

    /** Build the complete system prompt */
    async build(context: Partial<PromptSectionContext>): Promise<string> {
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

        return renderedSections.filter(Boolean).join('\n\n');
    }
}

export { PromptSection, PromptSectionContext } from './PromptSection';
export { IdentitySection, IdentityConfig } from './sections/IdentitySection';
export { ToolsSection } from './sections/ToolsSection';
export { DateTimeSection } from './sections/DateTimeSection';
export { MemorySection } from './sections/MemorySection';
export { ProjectContextSection } from './sections/ProjectContextSection';
