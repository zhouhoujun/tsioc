export interface ChannelMessage {
    id: string;
    channel: string;
    sender: string;
    recipient?: string;
    sessionId?: string;
    threadId?: string;
    content: string;
    timestamp: number;
    metadata?: Record<string, any>;
}
