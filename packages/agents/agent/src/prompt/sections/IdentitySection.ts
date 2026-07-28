import { PromptSection, PromptSectionContext } from '../PromptSection';
import { Injectable } from '@tsdi/ioc';

export interface IdentityConfig {
    name?: string;
    role?: string;
    traits?: string[];
    rules?: string[];
}

/**
 * Renders the agent's identity — name, role, behavioral rules.
 * Matches zeroclaw's IdentitySection / SOUL.md pattern.
 *
 * Configure via setIdentity():
 *   const section = ctx.get(IdentitySection);
 *   section.setIdentity({ name: 'MyBot', role: 'assistant', traits: ['helpful'], rules: ['Be concise'] });
 */
@Injectable()
export class IdentitySection extends PromptSection {
    name(): string { return 'identity'; }
    priority = 10;

    private config: IdentityConfig = {};

    /** Set identity configuration at runtime */
    setIdentity(config: IdentityConfig): void {
        this.config = config;
    }

    render(context: PromptSectionContext): string {
        const cfg = this.config ?? {};
        const lines: string[] = [];
        const toolNames = new Set((context.tools || []).map(tool => tool.name));

        if (cfg.name) {
            lines.push(`You are ${cfg.name}.`);
        }
        if (cfg.role) {
            lines.push(`Your role: ${cfg.role}`);
        }
        if (cfg.traits?.length) {
            lines.push(`Personality: ${cfg.traits.join(', ')}`);
        }
        if (cfg.rules?.length) {
            lines.push('Rules:');
            cfg.rules.forEach(r => lines.push(`- ${r}`));
        }

        lines.push('You are an autonomous task agent.');
        lines.push('You have access to tools. Use them when they can help accomplish the user\'s goal.');
        lines.push('When you receive tool results, use them to inform your next actions.');
        lines.push('First understand the user\'s goal, constraints, and any missing information before acting.');
        lines.push('For answer-only requests such as system design, brainstorming, outlines, documentation, explanations, or proposals that do not require inspecting or changing the workspace, answer directly instead of calling project/planning tools just to structure the reply.');
        lines.push('When the user asks for a concrete code or file change and the necessary tools are available, do the work instead of stopping at analysis or a plan.');
        lines.push('For complex, multi-step, or ambiguous requests, break the work into smaller steps and track the plan explicitly.');
        lines.push('Do not stop after only a plan, summary, or status update for an actionable request; either continue with the next concrete step or ask one concise clarification question.');
        lines.push('When useful, use planning and delegation tools such as todo, ask_user, and spawn_agent to decompose work or handle independent subtasks.');
        if (toolNames.has('todo') || toolNames.has('project_intel')) {
            lines.push('Do not call `todo` or `project_intel` for a pure conversational answer unless the user explicitly asks for a tracked plan, a handoff artifact, or project/workspace analysis.');
        }
        if (toolNames.has('coding_task')) {
            lines.push('For non-trivial coding, refactoring, testing, or multi-file edit requests, prefer coding_task to plan and execute the workflow instead of spending many small tool rounds.');
            lines.push('Do not end with only a proposed patch when coding_task or file-editing tools can carry the change through.');
        }
        lines.push('When you ask a clarification question, keep it to one question and explain the next action you will take after the answer.');
        lines.push('When the user answers a clarification question, continue the task directly with the new information instead of stopping early.');
        if (toolNames.has('git_operations')) {
            lines.push('After modifying code or tests, inspect the resulting git diff before the final answer and summarize the changed files and verification status.');
        }
        lines.push('If a tool or external service is unavailable, say so clearly and provide the next best fallback.');

        return lines.join('\n');
    }
}
