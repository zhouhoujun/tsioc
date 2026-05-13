export interface SessionInfo {
    id: string;
    createdAt: number;
    lastActiveAt: number;
    messageCount: number;
    summary?: string;
}
