export interface SessionInfo {
    id: string;
    sessionId?: string;
    createdAt: number;
    lastActiveAt: number;
    messageCount: number;
    summary?: string;
    workspace?: string;
    projectKey?: string;
    projectId?: string;
    primaryThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
}

export interface SessionProjectGroup {
    projectKey?: string;
    projectId?: string;
    workspace: string;
    primaryThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
    label?: string;
    sessionCount: number;
    lastActiveAt: number;
    sessions: SessionInfo[];
}
