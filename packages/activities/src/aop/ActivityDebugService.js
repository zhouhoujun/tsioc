"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityDebugService = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const ActivityInterceptorService_1 = require("./ActivityInterceptorService");
let ActivityDebugService = class ActivityDebugService {
    constructor(injector, interceptorService) {
        this.injector = injector;
        this.interceptorService = interceptorService;
        this.executionHistory = new Map();
    }
    async executeWithDebug(activity, context, options) {
        const executionId = options?.executionId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const activityName = activity.name || activity.constructor?.name || 'Anonymous';
        const startTime = Date.now();
        if (options?.trackExecution) {
            this.executionHistory.set(executionId, {
                activityName,
                startTime,
                context: { ...context }
            });
        }
        try {
            const result = await this.interceptorService.executeWithInterceptors(activity, context, executionId);
            if (options?.trackExecution) {
                const record = this.executionHistory.get(executionId);
                if (record) {
                    record.endTime = Date.now();
                    record.result = result;
                }
            }
            return result;
        }
        catch (error) {
            if (options?.trackExecution) {
                const record = this.executionHistory.get(executionId);
                if (record) {
                    record.endTime = Date.now();
                    record.result = {
                        success: false,
                        error: error
                    };
                }
            }
            throw error;
        }
    }
    getExecutionHistory(executionId) {
        if (executionId) {
            const record = this.executionHistory.get(executionId);
            if (!record)
                return [];
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
    clearExecutionHistory() {
        this.executionHistory.clear();
    }
    filterLogs(filter) {
        return this.interceptorService.getLogs(filter);
    }
    getLogsByActivity(activityName) {
        return this.interceptorService.getLogs({ activityName });
    }
    getLogsByExecution(executionId) {
        return this.interceptorService.getLogs({ executionId });
    }
    getFailedActivities() {
        return this.interceptorService.getLogs({ success: false });
    }
    getTraces(executionId) {
        return this.interceptorService.getTraces(executionId);
    }
    enableTracing() {
        this.interceptorService.setEnableTrace(true);
    }
    disableTracing() {
        this.interceptorService.setEnableTrace(false);
    }
    isTracingEnabled() {
        return this.interceptorService.isTraceEnabled();
    }
    clearLogs() {
        this.interceptorService.clearLogs();
    }
    clearTraces() {
        this.interceptorService.clearTraces();
    }
    getDebugSummary() {
        const logs = this.interceptorService.getLogs();
        const traces = this.interceptorService.getTraces();
        const errorCount = logs.filter((l) => l.level === 'error').length;
        const successCount = logs.filter((l) => l.level !== 'error').length;
        return {
            totalLogs: logs.length,
            totalTraces: traces.length,
            executionsTracked: this.executionHistory.size,
            errorCount,
            successCount
        };
    }
};
exports.ActivityDebugService = ActivityDebugService;
exports.ActivityDebugService = ActivityDebugService = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Injector,
        ActivityInterceptorService_1.ActivityInterceptorService])
], ActivityDebugService);
//# sourceMappingURL=ActivityDebugService.js.map