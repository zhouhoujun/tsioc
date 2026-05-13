export interface SendMessage {
    id?: string;
    channel: string;
    recipient: string;
    content: string;
    sessionId?: string;
    threadId?: string;
    subject?: string;
    metadata?: Record<string, any>;
}
