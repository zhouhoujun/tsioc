"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityInterceptorService = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
let ActivityInterceptorService = class ActivityInterceptorService {
    constructor(injector) {
        this.injector = injector;
        this.interceptors = [];
        this.logEntries = [];
        this.traces = new Map();
        this.maxLogEntries = 1000;
        this.enableTrace = false;
    }
    registerInterceptor(registration) {
        const interceptor = registration.interceptor;
        const priority = interceptor.priority ?? 100;
        const idx = this.interceptors.findIndex(r => (r.interceptor.priority ?? 100) > priority);
        if (idx >= 0) {
            this.interceptors.splice(idx, 0, registration);
        }
        else {
            this.interceptors.push(registration);
        }
    }
    unregisterInterceptor(interceptor) {
        const idx = this.interceptors.findIndex(r => r.interceptor === interceptor);
        if (idx >= 0) {
            this.interceptors.splice(idx, 1);
        }
    }
    clearInterceptors() {
        this.interceptors = [];
    }
    getInterceptors() {
        return this.interceptors
            .filter(r => r.enabled !== false)
            .map(r => r.interceptor);
    }
    matchesFilter(activityName, filter) {
        if (!filter)
            return true;
        if (typeof filter === 'string') {
            return activityName === filter || activityName.includes(filter);
        }
        if (filter instanceof RegExp) {
            return filter.test(activityName);
        }
        return filter(activityName);
    }
    getActivityName(activity) {
        return activity.name || activity.constructor?.name || 'Anonymous';
    }
    async executeWithInterceptors(activity, context, executionId) {
        const activityName = this.getActivityName(activity);
        const startTime = Date.now();
        const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const trace = {
            traceId,
            executionId: executionId || '',
            activityName,
            startTime,
            inputContext: { ...context },
            children: [],
            success: false
        };
        if (this.enableTrace) {
            this.traces.set(traceId, trace);
        }
        const beforeInterceptors = this.interceptors
            .filter(r => r.enabled !== false && r.interceptor.type === 'before')
            .filter(r => this.matchesFilter(activityName, r.interceptor.activityFilter));
        const afterInterceptors = this.interceptors
            .filter(r => r.enabled !== false && r.interceptor.type === 'after')
            .filter(r => this.matchesFilter(activityName, r.interceptor.activityFilter));
        const aroundInterceptors = this.interceptors
            .filter(r => r.enabled !== false && r.interceptor.type === 'around')
            .filter(r => this.matchesFilter(activityName, r.interceptor.activityFilter));
        const errorInterceptors = this.interceptors
            .filter(r => r.enabled !== false && r.interceptor.type === 'onError')
            .filter(r => this.matchesFilter(activityName, r.interceptor.activityFilter));
        let currentContext = context;
        try {
            for (const reg of beforeInterceptors) {
                if (reg.interceptor.before) {
                    currentContext = await reg.interceptor.before(currentContext, activity);
                }
            }
            const proceed = async () => {
                return activity.execute(currentContext);
            };
            let result;
            if (aroundInterceptors.length > 0) {
                let chain = proceed;
                for (const reg of aroundInterceptors) {
                    const nextChain = chain;
                    const interceptor = reg.interceptor;
                    chain = async () => {
                        if (interceptor.around) {
                            return interceptor.around(currentContext, activity, nextChain);
                        }
                        return nextChain();
                    };
                }
                result = await chain();
            }
            else {
                result = await proceed();
            }
            for (const reg of afterInterceptors) {
                if (reg.interceptor.after) {
                    result = await reg.interceptor.after(currentContext, activity, result) ?? result;
                }
            }
            trace.endTime = Date.now();
            trace.duration = trace.endTime - trace.startTime;
            trace.outputResult = result;
            trace.success = result.success;
            this.logEntries.push({
                level: result.success ? 'info' : 'error',
                activityName,
                message: `Activity ${result.success ? 'completed' : 'failed'}`,
                context: currentContext,
                result,
                timestamp: Date.now(),
                executionId
            });
            return result;
        }
        catch (error) {
            let errorResult = {
                success: false,
                error: error
            };
            for (const reg of errorInterceptors) {
                if (reg.interceptor.onError) {
                    errorResult = await reg.interceptor.onError(currentContext, activity, error) ?? errorResult;
                }
            }
            trace.endTime = Date.now();
            trace.duration = trace.endTime - trace.startTime;
            trace.outputResult = errorResult;
            trace.success = false;
            this.logEntries.push({
                level: 'error',
                activityName,
                message: `Activity error: ${error.message}`,
                context: currentContext,
                error: error,
                timestamp: Date.now(),
                executionId
            });
            return errorResult;
        }
    }
    log(level, activityName, message, options) {
        this.logEntries.push({
            level,
            activityName,
            message,
            context: options?.context,
            result: options?.result,
            error: options?.error,
            timestamp: Date.now(),
            executionId: options?.executionId
        });
        if (this.logEntries.length > this.maxLogEntries) {
            this.logEntries.shift();
        }
    }
    getLogs(filter) {
        let entries = [...this.logEntries];
        if (!filter)
            return entries;
        if (filter.activityName) {
            entries = entries.filter(e => this.matchesFilter(e.activityName, filter.activityName));
        }
        if (filter.level) {
            entries = entries.filter(e => e.level === filter.level);
        }
        if (filter.timeRange) {
            if (filter.timeRange.start) {
                entries = entries.filter(e => e.timestamp >= filter.timeRange.start);
            }
            if (filter.timeRange.end) {
                entries = entries.filter(e => e.timestamp <= filter.timeRange.end);
            }
        }
        if (filter.executionId) {
            entries = entries.filter(e => e.executionId === filter.executionId);
        }
        if (filter.success !== undefined) {
            entries = entries.filter(e => filter.success === true ? e.result?.success : !e.result?.success);
        }
        const offset = filter.offset ?? 0;
        const limit = filter.limit ?? entries.length;
        return entries.slice(offset, offset + limit);
    }
    clearLogs() {
        this.logEntries = [];
    }
    getTraces(executionId) {
        const traces = Array.from(this.traces.values());
        if (executionId) {
            return traces.filter(t => t.executionId === executionId);
        }
        return traces;
    }
    clearTraces() {
        this.traces.clear();
    }
    setEnableTrace(enable) {
        this.enableTrace = enable;
    }
    isTraceEnabled() {
        return this.enableTrace;
    }
    setMaxLogEntries(max) {
        this.maxLogEntries = max;
    }
};
exports.ActivityInterceptorService = ActivityInterceptorService;
exports.ActivityInterceptorService = ActivityInterceptorService = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Injector])
], ActivityInterceptorService);
//# sourceMappingURL=ActivityInterceptorService.js.map