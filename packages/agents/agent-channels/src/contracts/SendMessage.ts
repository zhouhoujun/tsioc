import { Attachment } from './Attachment';

export interface SendMessage {
    id?: string;
    channel: string;
    recipient: string;
    content: string;
    sessionId?: string;
    threadId?: string;
    subject?: string;
    attachments?: Attachment[];
    replyTo?: string;
    metadata?: Record<string, any>;
}
