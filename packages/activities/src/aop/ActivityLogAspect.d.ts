import { JoinPoint } from '@tsdi/aop';
import { ActivityInterceptorService } from './ActivityInterceptorService';
export type ActivityLogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface ActivityLogOptions {
    level?: ActivityLogLevel;
    logBefore?: boolean;
    logAfter?: boolean;
    logError?: boolean;
    includeContext?: boolean;
    includeResult?: boolean;
    activityFilter?: string | RegExp | ((activityName: string) => boolean);
}
export declare class ActivityLogAspect {
    private interceptorService;
    private options;
    private activityTimers;
    constructor(interceptorService: ActivityInterceptorService);
    setOptions(options: Partial<ActivityLogOptions>): void;
    getOptions(): ActivityLogOptions;
    private getActivityName;
    private matchesFilter;
    private shouldLog;
    beforeExecute(joinPoint: JoinPoint): void;
    afterExecute(joinPoint: JoinPoint): void;
    afterThrowing(joinPoint: JoinPoint): void;
}
