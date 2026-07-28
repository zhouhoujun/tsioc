import { Inject, Injectable, Injector, Optional } from '@tsdi/ioc';
import { ToolRegistry } from '@tsdi/agent';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { AgentToolsOptions } from '../src/options';
import { CodingTaskActionRecord } from './coding-task-store';

export interface WorkspaceActionRunContext {
    sessionId: string;
    principalId?: string;
}

export interface WorkspaceActionRunResult {
    tool: string;
    output: any;
    summary: string;
}

export abstract class WorkspaceActionRunner {
    abstract getSupportedTools(): string[];
    abstract run(action: CodingTaskActionRecord, context: WorkspaceActionRunContext): Promise<WorkspaceActionRunResult>;
}

const DEFAULT_SUPPORTED_TOOLS = [
    'list_dir',
    'stat',
    'glob_search',
    'content_search',
    'read_file',
    'write_file',
    'edit_file',
    'mkdir',
    'copy_file',
    'move_file',
    'delete_file',
    'terminal',
    'process.start',
    'process.poll',
    'process.kill',
    'git_operations',
    'llm_task',
    'project_intel',
    'ai_cli'
];

@Injectable({ provide: WorkspaceActionRunner })
export class ToolRegistryWorkspaceActionRunner extends WorkspaceActionRunner {
    private readonly supportedTools = new Set(DEFAULT_SUPPORTED_TOOLS);

    constructor(
        private readonly injector: Injector,
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private readonly options?: AgentToolsOptions | null
    ) {
        super();
    }

    getSupportedTools(): string[] {
        return Array.from(this.supportedTools.values());
    }

    async run(action: CodingTaskActionRecord, context: WorkspaceActionRunContext): Promise<WorkspaceActionRunResult> {
        if (!this.supportedTools.has(action.tool)) {
            throw new Error(`Coding action tool '${action.tool}' is not supported.`);
        }

        const tools = this.injector.get(ToolRegistry);
        const tool = tools.getTool(action.tool);
        if (!tool) {
            throw new Error(`Coding action tool '${action.tool}' is not registered.`);
        }

        if (!(await tools.isToolActive(context.sessionId, action.tool))) {
            await tools.activateTool(context.sessionId, action.tool);
        }

        const output = await tools.invoke(
            action.tool,
            this.normalizeInput(action.tool, action.input),
            context.sessionId,
            context.principalId
        );

        return {
            tool: action.tool,
            output,
            summary: this.summarizeOutput(output)
        };
    }

    private normalizeInput(tool: string, input: Record<string, any>): Record<string, any> {
        const next = input && typeof input === 'object' ? { ...input } : {};
        if (tool === 'list_dir' && typeof next.path !== 'string') {
            next.path = '.';
        }
        if (tool === 'terminal' && typeof next.workdir !== 'string') {
            next.workdir = '.';
        }
        if (tool === 'ai_cli' && typeof next.working_directory !== 'string') {
            next.working_directory = '.';
        }
        return next;
    }

    private summarizeOutput(output: any): string {
        if (output == null) {
            return 'completed with no output';
        }
        if (typeof output === 'string') {
            return output.length > 160 ? `${output.slice(0, 157)}...` : output;
        }
        if (Array.isArray(output)) {
            return `returned ${output.length} item(s)`;
        }
        if (typeof output === 'object') {
            const keys = Object.keys(output);
            if (!keys.length) {
                return 'returned an empty object';
            }
            if (typeof output.error === 'string') {
                return output.error;
            }
            return `returned ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ', ...' : ''}`;
        }
        return String(output);
    }
}
