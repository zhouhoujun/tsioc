import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

type ProjectTodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface ProjectTodoItem {
    id: string;
    content: string;
    status: ProjectTodoStatus;
}

@Injectable()
export class ProjectIntelTool implements AgentTool {
    name = 'project_intel';
    description = 'Summarize task context, risks, and handoff notes for the current project.';
    inputSchema = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['summary', 'risks', 'handoff'] },
            task: { type: 'string' },
            todos: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        content: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] }
                    },
                    required: ['id', 'content', 'status']
                }
            },
            notes: { type: 'array', items: { type: 'string' } }
        },
        required: ['task']
    };
    toolset = 'project';
    source = 'local';
    execution = { readOnly: true };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const action = this.resolveAction(input?.action);
        const task = this.requireString(input?.task, 'task');
        const todos = this.resolveTodos(input?.todos);
        const notes = this.resolveNotes(input?.notes);
        const todoSummary = this.summarizeTodos(todos);
        return {
            action,
            sessionId: context.sessionId,
            task,
            todoSummary,
            highlights: this.buildHighlights(action, task, todos, notes),
            notes
        };
    }

    private resolveAction(value: unknown): 'summary' | 'risks' | 'handoff' {
        if (value == null || value === '') {
            return 'summary';
        }
        if (value !== 'summary' && value !== 'risks' && value !== 'handoff') {
            throw new Error('Invalid project_intel input: action must be summary, risks, or handoff.');
        }
        return value;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid project_intel input: ${field} must be a non-empty string.`);
        }
        return value.trim();
    }

    private resolveTodos(value: unknown): ProjectTodoItem[] {
        if (value == null) {
            return [];
        }
        if (!Array.isArray(value)) {
            throw new Error('Invalid project_intel input: todos must be an array when provided.');
        }
        return value.map(item => ({
            id: this.requireString(item?.id, 'todo id'),
            content: this.requireString(item?.content, 'todo content'),
            status: this.resolveTodoStatus(item?.status)
        }));
    }

    private resolveTodoStatus(value: unknown): ProjectTodoStatus {
        if (value !== 'pending' && value !== 'in_progress' && value !== 'completed' && value !== 'cancelled') {
            throw new Error('Invalid project_intel input: todo status must be pending, in_progress, completed, or cancelled.');
        }
        return value;
    }

    private resolveNotes(value: unknown): string[] {
        if (value == null) {
            return [];
        }
        if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) {
            throw new Error('Invalid project_intel input: notes must be an array of non-empty strings when provided.');
        }
        return value.map(item => item.trim());
    }

    private summarizeTodos(todos: ProjectTodoItem[]): { total: number; pending: number; in_progress: number; completed: number; cancelled: number; } {
        return todos.reduce((summary, todo) => {
            summary.total += 1;
            summary[todo.status] += 1;
            return summary;
        }, {
            total: 0,
            pending: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0
        });
    }

    private buildHighlights(action: 'summary' | 'risks' | 'handoff', task: string, todos: ProjectTodoItem[], notes: string[]): string[] {
        const highlights: string[] = [];
        if (action === 'summary') {
            highlights.push(`Task: ${task}`);
            if (todos.length) {
                highlights.push(`Todos: ${todos.length} tracked item(s)`);
            }
        }
        if (action === 'risks') {
            highlights.push(`Risk focus: ${task}`);
            if (todos.some(todo => todo.status === 'in_progress')) {
                highlights.push('There are still in-progress items that may affect completion.');
            }
        }
        if (action === 'handoff') {
            highlights.push(`Handoff: ${task}`);
            highlights.push(`Open items: ${todos.filter(todo => todo.status !== 'completed' && todo.status !== 'cancelled').length}`);
        }
        notes.forEach(note => highlights.push(note));
        return highlights;
    }
}
