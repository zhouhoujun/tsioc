import { PromptSection, PromptSectionContext } from '../PromptSection';
import { Injectable } from '@tsdi/ioc';

/**
 * Renders relevant memory records as context for the model.
 */
@Injectable()
export class MemorySection extends PromptSection {
    name(): string { return 'memory'; }
    priority = 30;
    /** Retrieved memory changes per turn - rendered after the cacheable prefix. */
    cacheable = false;

    render(context: PromptSectionContext): string {
        if (!context.memory) return '';
        return `## Relevant Memories\n${context.memory}`;
    }
}
