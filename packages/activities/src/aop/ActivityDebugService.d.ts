import { Injector } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { ActivityInterceptorService } from './ActivityInterceptorService';
import { ActivityLogEntry, LogFilterOptions, ActivityTrace } from './ActivityInterceptor';
export declare class ActivityDebugService {
    private injector;
    private interceptorService;
    private executionHistory;
    constructor(injector: Injector, interceptorService: ActivityInterceptorService);
    executeWithDebug(activity: Activity, context: ActivityContext, options?: {
        trackExecution?: boolean;
        executionId?: string;
    }): Promise<ActivityResult>;
    getExecutionHistory(executionId?: string): Array<{
        activityName: string;
        startTime: number;
        endTime?: number;
        duration?: number;
        result?: ActivityResult;
        context: ActivityContext;
    }>;
    clearExecutionHistory(): void;
    filterLogs(filter: LogFilterOptions): ActivityLogEntry[];
    getLogsByActivity(activityName: string): ActivityLogEntry[];
    getLogsByExecution(executionId: string): ActivityLogEntry[];
    getFailedActivities(): ActivityLogEntry[];
    getTraces(executionId?: string): ActivityTrace[];
    enableTracing(): void;
    disableTracing(): void;
    isTracingEnabled(): boolean;
    clearLogs(): void;
    clearTraces(): void;
    getDebugSummary(): {
        totalLogs: number;
        totalTraces: number;
        executionsTracked: number;
        errorCount: number;
        successCount: number;
    };
}
