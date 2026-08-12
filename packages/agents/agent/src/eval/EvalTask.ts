export interface EvalTask {
    id: string;
    repo?: string;
    issue: string;
    sessionId?: string;
    profile?: string;
    verifyCommands?: string[];
    expectedCriteria?: string[];
}

export interface EvalVerification { command: string; ok: boolean; output?: string; }

export interface EvalRun {
    id: string;
    taskId: string;
    status: 'passed' | 'failed';
    score: number;
    startedAt: string;
    finishedAt: string;
    message?: string;
    verifications: EvalVerification[];
    diff?: { files: number; additions: number; deletions: number };
}
