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
        const toolNames = new Set(tools.map(tool => tool.name));
        for (const tool of tools) {
            lines.push(`- ${tool.name}: ${tool.description}`);
        }
        const hasDeferredSessionTools = tools.some(tool => tool.activation?.kind === 'deferred' && tool.activation?.scope === 'session');
        lines.push('');
        lines.push('To use a tool, respond with a JSON tool call in the format:');
        lines.push('{"tool": "<name>", "args": {...}}');
        if (hasDeferredSessionTools) {
            lines.push('');
            lines.push('Session-scoped deferred tools are available for this turn.');
            lines.push('Invoke them directly when needed; the host will activate them for the current session.');
        }
        if (toolNames.has('coding_task')) {
            lines.push('');
            lines.push('For substantial coding or test-writing tasks, prefer `coding_task` so discovery, edits, and verification happen within one coordinated tool run.');
            lines.push('If the user asked for an actual code change, default to executing the change with tools instead of replying with instructions alone.');
            lines.push('For a multi-file build, use `todo` to track the plan, then execute implementation and tests through `coding_task`; use `ask_user` only for a genuinely blocking product decision.');
        }
        if (toolNames.has('todo') || toolNames.has('project_intel')) {
            lines.push('');
            lines.push('For pure answer-generation tasks such as designs, plans, explanations, and proposals, do not call `todo` or `project_intel` unless the user explicitly asked for tracked execution, a handoff summary, or workspace/project analysis.');
        }
        lines.push('Classify intent before choosing tools: design/discuss/explain/evaluate/propose requests are answer-only unless workspace inspection is requested; generate/create/build/implement/scaffold/write/modify/fix/deliver requests require workspace changes and verification.');
        if (toolNames.has('git_operations')) {
            lines.push('');
            lines.push('When you finish code changes, use `git_operations` with `action: "diff"` to inspect the resulting patch before your final answer.');
        }

        if (toolNames.has('weather') && toolNames.has('location')) {
            lines.push('');
            lines.push('When the user asks about current local weather without naming a city or region, do not ask for the city first.');
            lines.push('Use `weather` without a location, or use `location` first and then `weather` if needed.');
        }

        lines.push('');
        lines.push('For multi-step requests, break the work into explicit subtasks before calling tools.');
        lines.push('Prefer small sequential tool steps over one opaque action.');
        lines.push('After a useful tool result, do not stop at a bare summary; either continue with the next step or ask one concise follow-up question and state the next action.');

        return lines.join('\n');
    }
}
