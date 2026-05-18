export type AgentScheduleType = 'once' | 'interval' | 'cron';

export interface CronScheduleSpec {
    type: 'cron';
    cronExpr: string;
}

export interface IntervalScheduleSpec {
    type: 'interval';
    intervalMs: number;
    runAt?: number;
}

export interface OneShotScheduleSpec {
    type: 'once';
    runAt: number;
}

export type AgentScheduleSpec = CronScheduleSpec | IntervalScheduleSpec | OneShotScheduleSpec;
