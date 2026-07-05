import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

export interface PollOption {
    label: string;
    count: number;
}

export interface PollData {
    id: string;
    question: string;
    options: PollOption[];
    totalVotes: number;
    createdAt: number;
    closedAt?: number;
}

@Abstract()
export abstract class PollAdapter {
    abstract createPoll(question: string, options: string[]): Promise<PollData>;
    abstract vote(pollId: string, optionLabel: string): Promise<PollData>;
    abstract closePoll(pollId: string): Promise<PollData>;
    abstract getPoll(pollId: string): Promise<PollData | null>;
    abstract listPolls(): Promise<Array<{ id: string; question: string; totalVotes: number; closed: boolean }>>;
}

@Injectable()
export class PollTool implements AgentTool {
    name = 'poll';
    description = 'Create, vote, and manage polls for group decision-making, preference gathering, or consensus building. Supports multiple options and tracks vote counts.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['create', 'vote', 'close', 'get', 'list'],
                description: 'Poll operation.'
            },
            question: {
                type: 'string',
                description: 'Poll question (required for create).'
            },
            options: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 10,
                description: 'Poll options (required for create, 2-10 items).'
            },
            poll_id: {
                type: 'string',
                description: 'Poll ID (required for vote, close, get).'
            },
            option: {
                type: 'string',
                description: 'Selected option label (required for vote).'
            }
        },
        required: ['action']
    };
    toolset = 'poll';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        private adapter: PollAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const action = typeof input?.action === 'string' ? input.action : '';

        switch (action) {
            case 'list': {
                const polls = await this.adapter.listPolls();
                return { polls, total: polls.length };
            }
            case 'create': {
                const question = this.requireString(input?.question, 'poll question');
                const options = this.requireOptions(input?.options);
                const poll = await this.adapter.createPoll(question, options);
                return { created: true, poll };
            }
            case 'vote': {
                const pollId = this.requireString(input?.poll_id, 'poll poll_id');
                const option = this.requireString(input?.option, 'poll option');
                const poll = await this.adapter.vote(pollId, option);
                return { voted: true, poll };
            }
            case 'close': {
                const pollId = this.requireString(input?.poll_id, 'poll poll_id');
                const poll = await this.adapter.closePoll(pollId);
                return { closed: true, poll };
            }
            case 'get': {
                const pollId = this.requireString(input?.poll_id, 'poll poll_id');
                const poll = await this.adapter.getPoll(pollId);
                if (!poll) { throw new Error(`Poll '${pollId}' not found.`); }
                return { poll };
            }
            default:
                throw new Error('Invalid action. Must be: create, vote, close, get, list.');
        }
    }

    private requireOptions(value: unknown): string[] {
        if (!Array.isArray(value) || value.length < 2 || value.length > 10) {
            throw new Error('Invalid poll options: must be an array of 2-10 strings.');
        }
        const opts = value.filter((o: any) => typeof o === 'string' && o.trim());
        if (opts.length < 2) {
            throw new Error('Invalid poll options: at least 2 non-empty options required.');
        }
        return opts;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
