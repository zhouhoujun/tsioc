import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

export interface MessageChannel {
    type: 'telegram' | 'discord' | 'email' | 'slack' | 'custom';
    recipient: string;
}

export interface SendMessageRequest {
    channel: MessageChannel;
    subject?: string;
    content: string;
    priority?: 'low' | 'normal' | 'high';
}

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    channel: string;
    error?: string;
}

@Abstract()
export abstract class MessagingAdapter {
    abstract send(request: SendMessageRequest): Promise<SendMessageResult>;
    abstract validate?(channel: MessageChannel): Promise<boolean>;
}


@Injectable()
export class SendMessageTool implements AgentTool {
    name = 'send_message';
    description = 'Send a message across configured channels (Telegram, Discord, email, Slack, or custom endpoints). Useful for notifications, alerts, or human handoffs.';
    inputSchema = {
        type: 'object',
        properties: {
            channel: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['telegram', 'discord', 'email', 'slack', 'custom'],
                        description: 'Message channel type.'
                    },
                    recipient: {
                        type: 'string',
                        description: 'Channel-specific recipient identifier (chat ID, email address, webhook URL, etc.).'
                    }
                },
                required: ['type', 'recipient'],
                description: 'Target channel configuration.'
            },
            subject: {
                type: 'string',
                description: 'Optional message subject or title.'
            },
            content: {
                type: 'string',
                description: 'Message body content.'
            },
            priority: {
                type: 'string',
                enum: ['low', 'normal', 'high'],
                description: 'Message priority (default: normal).'
            }
        },
        required: ['channel', 'content']
    };
    toolset = 'communication';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        private adapter: MessagingAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const channel = this.resolveChannel(input?.channel);
        const content = this.requireString(input?.content, 'send_message content');
        const result = await this.adapter.send({
            channel,
            subject: typeof input?.subject === 'string' ? input.subject : undefined,
            content,
            priority: typeof input?.priority === 'string' && ['low', 'normal', 'high'].includes(input.priority)
                ? input.priority as 'low' | 'normal' | 'high'
                : undefined
        });
        return {
            success: result.success,
            messageId: result.messageId,
            channel: result.channel,
            error: result.error
        };
    }

    private resolveChannel(value: any): MessageChannel {
        if (!value || typeof value !== 'object') {
            throw new Error('Invalid send_message input: channel must be an object with type and recipient.');
        }
        const type = value.type;
        const validTypes = ['telegram', 'discord', 'email', 'slack', 'custom'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid send_message channel type: must be one of ${validTypes.join(', ')}.`);
        }
        const recipient = this.requireString(value.recipient, 'send_message channel recipient');
        return { type, recipient };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
