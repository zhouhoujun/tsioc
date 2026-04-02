import { Injectable, Injector } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { ActivityInterceptorService } from './ActivityInterceptorService';
import { ActivityLogEntry, LogFilterOptions, ActivityTrace } from './ActivityInterceptor';

@Injectable()
export class ActivityDebugService {
    private executionHistory: Map<string, {
        activityName: string;
        startTime: number;
        endTime?: number;
        result?: ActivityResult;
        context: ActivityContext;
    }> = new Map();

    constructor(
        private injector: Injector,
        private interceptorService: ActivityInterceptorService
    ) {}

    async executeWithDebug(
        activity: Activity,
        context: ActivityContext,
        options?: {
            trackExecution?: boolean;
            executionId?: string;
        }
    ): Promise<ActivityResult> {
        const executionId = options?.executionId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const activityName = (activity as any).name || activity.constructor?.name || 'Anonymous';

        const startTime = Date.now();

        if (options?.trackExecution) {
            this.executionHistory.set(executionId, {
                activityName,
                startTime,
                context: { ...context }
            });
        }

        try {
            const result = await this.interceptorService.executeWithInterceptors(
                activity,
                context,
                executionId
            );

            if (options?.trackExecution) {
                const record = this.executionHistory.get(executionId);
                if (record) {
                    record.endTime = Date.now();
                    record.result = result;
                }
            }

            return result;
        } catch (error) {
            if (options?.trackExecution) {
                const record = this.executionHistory.get(executionId);
                if (record) {
                    record.endTime = Date.now();
                    record.result = {
                        success: false,
                        error: error as Error
                    };
                }
            }
            throw error;
        }
    }

    getExecutionHistory(executionId?: string): Array<{
        activityName: string;
        startTime: number;
        endTime?: number;
        duration?: number;
        result?: ActivityResult;
        context: ActivityContext;
    }> {
        if (executionId) {
            const record = this.executionHistory.get(executionId);
            if (!record) return [];
            return [{
                ...record,
                duration: record.endTime ? record.endTime - record.startTime : undefined
            }];
        }

        return Array.from(this.executionHistory.values()).map(record => ({
            ...record,
            duration: record.endTime ? record.endTime - record.startTime : undefined
        }));
    }

    clearExecutionHistory(): void {
        this.executionHistory.clear();
    }

    filterLogs(filter: LogFilterOptions): ActivityLogEntry[] {
        return this.interceptorService.getLogs(filter);
    }

    getLogsByActivity(activityName: string): ActivityLogEntry[] {
        return this.interceptorService.getLogs({ activityName });
    }

    getLogsByExecution(executionId: string): ActivityLogEntry[] {
        return this.interceptorService.getLogs({ executionId });
    }

    getFailedActivities(): ActivityLogEntry[] {
        return this.interceptorService.getLogs({ success: false });
    }

    getTraces(executionId?: string): ActivityTrace[] {
        return this.interceptorService.getTraces(executionId);
    }

    enableTracing(): void {
        this.interceptorService.setEnableTrace(true);
    }

    disableTracing(): void {
        this.interceptorService.setEnableTrace(false);
    }

    isTracingEnabled(): boolean {
        return this.interceptorService.isTraceEnabled();
    }

    clearLogs(): void {
        this.interceptorService.clearLogs();
    }

    clearTraces(): void {
        this.interceptorService.clearTraces();
    }

    getDebugSummary(): {
        totalLogs: number;
        totalTraces: number;
        executionsTracked: number;
        errorCount: number;
        successCount: number;
    } {
        const logs = this.interceptorService.getLogs();
        const traces = this.interceptorService.getTraces();
        const errorCount = logs.filter((l: ActivityLogEntry) => l.level === 'error').length;
        const successCount = logs.filter((l: ActivityLogEntry) => l.level !== 'error').length;

        return {
            totalLogs: logs.length,
            totalTraces: traces.length,
            executionsTracked: this.executionHistory.size,
            errorCount,
            successCount
        };
    }
}
