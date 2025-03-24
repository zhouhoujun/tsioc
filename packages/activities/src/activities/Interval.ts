import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface IntervalActivityContext extends ActivityContext {
    /**
     * 要执行的活动
     */
    action: Activity;
    /**
     * 执行间隔（毫秒）
     */
    interval?: number;
    /**
     * 最大执行次数
     */
    maxExecutions?: number;
    /**
     * 是否立即执行第一次
     */
    immediate?: boolean;
    /**
     * 执行回调
     */
    onExecution?: (execution: number, result: ActivityResult) => void;
    /**
     * 完成回调
     */
    onComplete?: () => void;
}

export interface IntervalActivityOptions {
    /**
     * 默认执行间隔
     */
    defaultInterval?: number;
    /**
     * 默认是否立即执行
     */
    defaultImmediate?: boolean;
}

@Injectable()
export class IntervalActivity implements Activity<IntervalActivityContext> {
    name = 'interval';
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;
    private executionCount = 0;

    constructor(private options: IntervalActivityOptions = {}) {
        this.options = {
            defaultInterval: 1000,
            defaultImmediate: false,
            ...options
        };
    }

    async execute(context: IntervalActivityContext): Promise<ActivityResult> {
        if (!context.action) {
            return {
                success: false,
                error: new Error('No action provided for interval execution')
            };
        }

        this.isRunning = true;
        this.executionCount = 0;
        const interval = context.interval ?? this.options.defaultInterval;
        const immediate = context.immediate ?? this.options.defaultImmediate;
        const maxExecutions = context.maxExecutions;

        return new Promise<ActivityResult>((resolve) => {
            const executeInterval = async () => {
                if (!this.isRunning) {
                    this.cleanup();
                    context.onComplete?.();
                    resolve({
                        success: true,
                        data: {
                            executionCount: this.executionCount,
                            interrupted: true
                        }
                    });
                    return;
                }

                try {
                    const result = await context.action.execute(context);
                    this.executionCount++;

                    context.onExecution?.(this.executionCount, result);

                    if (maxExecutions && this.executionCount >= maxExecutions) {
                        this.cleanup();
                        context.onComplete?.();
                        resolve({
                            success: true,
                            data: {
                                executionCount: this.executionCount,
                                completed: true
                            }
                        });
                        return;
                    }

                    this.intervalId = setTimeout(executeInterval, interval);
                } catch (error) {
                    this.cleanup();
                    resolve({
                        success: false,
                        error: error as Error,
                        data: {
                            executionCount: this.executionCount
                        }
                    });
                }
            };

            if (immediate) {
                executeInterval();
            } else {
                this.intervalId = setTimeout(executeInterval, interval);
            }
        });
    }

    async compensate(context: IntervalActivityContext): Promise<void> {
        this.cleanup();
    }

    private cleanup() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
