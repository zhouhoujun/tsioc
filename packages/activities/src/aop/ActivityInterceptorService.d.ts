import { Injector } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { IActivityInterceptor, InterceptorRegistration, ActivityLogEntry, LogFilterOptions, ActivityTrace } from './ActivityInterceptor';
export declare class ActivityInterceptorService {
    private injector;
    private interceptors;
    private logEntries;
    private traces;
    private maxLogEntries;
    private enableTrace;
    constructor(injector: Injector);
    registerInterceptor(registration: InterceptorRegistration): void;
    unregisterInterceptor(interceptor: IActivityInterceptor): void;
    clearInterceptors(): void;
    getInterceptors(): IActivityInterceptor[];
    private matchesFilter;
    private getActivityName;
    executeWithInterceptors(activity: Activity, context: ActivityContext, executionId?: string): Promise<ActivityResult>;
    log(level: ActivityLogEntry['level'], activityName: string, message: string, options?: {
        context?: ActivityContext;
        result?: ActivityResult;
        error?: Error;
        executionId?: string;
    }): void;
    getLogs(filter?: LogFilterOptions): ActivityLogEntry[];
    clearLogs(): void;
    getTraces(executionId?: string): ActivityTrace[];
    clearTraces(): void;
    setEnableTrace(enable: boolean): void;
    isTraceEnabled(): boolean;
    setMaxLogEntries(max: number): void;
}
