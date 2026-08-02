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
    originThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
    threadStatus?: string;
}

export interface SessionProjectGroup {
    projectKey?: string;
    projectId?: string;
    workspace: string;
    primaryThreadId?: string;
    originThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
    label?: string;
    sessionCount: number;
    lastActiveAt: number;
    sessions: SessionInfo[];
}

export interface SessionThreadGroup {
    threadId: string;
    projectId?: string;
    workspace: string;
    title?: string;
    rootRequest?: string;
    status: string;
    stage?: string;
    originThreadId?: string;
    currentSessionId?: string;
    sessionCount: number;
    createdAt?: number;
    updatedAt?: number;
    lastActiveAt: number;
    sessions: SessionInfo[];
}
