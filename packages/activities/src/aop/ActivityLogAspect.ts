import { Aspect, JoinPoint, JoinpointState, Before, AfterReturning, AfterThrowing } from '@tsdi/aop';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
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

@Aspect({
    within: Activity,
    singleton: true
})
export class ActivityLogAspect {
    private options: ActivityLogOptions = {
        level: 'info',
        logBefore: true,
        logAfter: true,
        logError: true,
        includeContext: false,
        includeResult: false
    };

    private activityTimers: Map<any, [number, number]> = new Map();

    constructor(private interceptorService: ActivityInterceptorService) {}

    setOptions(options: Partial<ActivityLogOptions>): void {
        this.options = { ...this.options, ...options };
    }

    getOptions(): ActivityLogOptions {
        return { ...this.options };
    }

    private getActivityName(target: any): string {
        return (target as any).name || target.constructor?.name || 'Anonymous';
    }

    private matchesFilter(activityName: string): boolean {
        const filter = this.options.activityFilter;
        if (!filter) return true;
        if (typeof filter === 'string') {
            return activityName === filter || activityName.includes(filter);
        }
        if (filter instanceof RegExp) {
            return filter.test(activityName);
        }
        return filter(activityName);
    }

    private shouldLog(activityName: string): boolean {
        return this.matchesFilter(activityName);
    }

    @Before('execution(Activity.execute)')
    beforeExecute(joinPoint: JoinPoint): void {
        const target = joinPoint.target;
        const activityName = this.getActivityName(target);

        if (!this.shouldLog(activityName)) return;

        this.activityTimers.set(target, process.hrtime());

        if (this.options.logBefore) {
            const context = joinPoint.args[0] as ActivityContext;
            this.interceptorService.log(
                this.options.level as ActivityLogLevel,
                activityName,
                `Starting activity: ${activityName}`,
                { context: this.options.includeContext ? context : undefined }
            );
        }
    }

    @AfterReturning('execution(Activity.execute)')
    afterExecute(joinPoint: JoinPoint): void {
        const target = joinPoint.target;
        const activityName = this.getActivityName(target);

        if (!this.shouldLog(activityName)) return;
        if (!this.options.logAfter) return;

        const startTime = this.activityTimers.get(target);
        this.activityTimers.delete(target);

        const result = joinPoint.returning as ActivityResult;
        const context = joinPoint.args[0] as ActivityContext;

        const duration = startTime ? process.hrtime(startTime) : [0, 0];
        const durationMs = duration[0] * 1000 + duration[1] / 1000000;

        this.interceptorService.log(
            result.success ? (this.options.level as ActivityLogLevel) : 'error',
            activityName,
            `Activity ${activityName} ${result.success ? 'completed' : 'failed'} in ${durationMs.toFixed(2)}ms`,
            {
                context: this.options.includeContext ? context : undefined,
                result: this.options.includeResult ? result : undefined
            }
        );
    }

    @AfterThrowing('execution(Activity.execute)')
    afterThrowing(joinPoint: JoinPoint): void {
        const target = joinPoint.target;
        const activityName = this.getActivityName(target);

        if (!this.shouldLog(activityName)) return;
        if (!this.options.logError) return;

        this.activityTimers.delete(target);

        const throwing = joinPoint.throwing as Error;
        const context = joinPoint.args[0] as ActivityContext;

        this.interceptorService.log(
            'error',
            activityName,
            `Activity ${activityName} error: ${throwing.message}`,
            {
                context: this.options.includeContext ? context : undefined,
                error: throwing
            }
        );
    }
}
