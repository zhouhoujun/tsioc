import { Attachment } from './Attachment';

export interface ChannelMessage {
    id: string;
    channel: string;
    sender: string;
    recipient?: string;
    sessionId?: string;
    threadId?: string;
    content: string;
    timestamp: number;
    attachments?: Attachment[];
    replyTo?: {
        messageId: string;
        content?: string;
        sender?: string;
    };
    metadata?: Record<string, any>;
}
