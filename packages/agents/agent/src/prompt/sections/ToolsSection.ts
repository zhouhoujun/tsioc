import { PromptSection, PromptSectionContext } from '../PromptSection';
import { Injectable } from '@tsdi/ioc';

/**
 * Renders available tool descriptions as text instructions.
 * Used when the model adapter doesn't natively support tool schemas,
 * or as reinforcement for native tool calling models.
 */
@Injectable()
export class ToolsSection extends PromptSection {
    name(): string { return 'tools'; }
    priority = 50;

    render(context: PromptSectionContext): string {
        const { tools } = context;
        if (!tools.length) return '';

        const lines: string[] = ['## Available Tools'];
        for (const tool of tools) {
            lines.push(`- ${tool.name}: ${tool.description}`);
        }
        lines.push('');
        lines.push('To use a tool, respond with a JSON tool call in the format:');
        lines.push('{"tool": "<name>", "args": {...}}');

        return lines.join('\n');
    }
}
