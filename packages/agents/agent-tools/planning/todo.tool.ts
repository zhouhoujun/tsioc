import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { TodoStore } from './todo-store';

@Injectable()
export class TodoTool implements AgentTool {
    name = 'todo';
    description = 'Read or update the current session todo list.';
    inputSchema = {
        type: 'object',
        properties: {
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
            merge: { type: 'boolean' }
        }
    };
    toolset = 'planning';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(private store: TodoStore = new TodoStore()) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const sessionId = context.sessionId;
        if (input?.todos === undefined) {
            return this.buildResult(sessionId);
        }
        if (!Array.isArray(input.todos)) {
            throw new Error('Invalid todo input: todos must be an array.');
        }
        if (input.merge) {
            this.store.merge(sessionId, input.todos);
        } else {
            this.store.replace(sessionId, input.todos);
        }
        return this.buildResult(sessionId);
    }

    private buildResult(sessionId: string): any {
        return {
            todos: this.store.read(sessionId),
            summary: this.store.summarize(sessionId)
        };
    }
}
