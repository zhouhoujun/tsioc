import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface IntervalActivityContext extends ActivityContext {
    /**
     * 间隔时间（毫秒）
     */
    interval: number;
    /**
     * 要执行的活动
     */
    action: Activity;
    /**
     * 最大执行次数（可选，undefined表示无限执行）
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
     * 默认间隔时间
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
    private isRunning = false;
    private timeoutId: NodeJS.Timeout | null = null;

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
                error: new Error('No action activity provided')
            };
        }

        const interval = context.interval ?? this.options.defaultInterval;
        if (interval < 0) {
            return {
                success: false,
                error: new Error('Invalid interval value')
            };
        }

        this.isRunning = true;
        let executionCount = 0;
        let lastResult: ActivityResult | null = null;

        try {
            return await new Promise<ActivityResult>((resolve, reject) => {
                const executeAction = async () => {
                    if (!this.isRunning) {
                        this.cleanup();
                        resolve({
                            success: true,
                            data: {
                                executions: executionCount,
                                interrupted: true,
                                lastResult
                            }
                        });
                        return;
                    }

                    try {
                        lastResult = await context.action.execute(context);
                        executionCount++;

                        // 调用执行回调
                        context.onExecution?.(executionCount, lastResult);

                        // 检查是否达到最大执行次数
                        if (context.maxExecutions && executionCount >= context.maxExecutions) {
                            this.cleanup();
                            context.onComplete?.();
                            resolve({
                                success: true,
                                data: {
                                    executions: executionCount,
                                    completed: true,
                                    lastResult
                                }
                            });
                            return;
                        }

                        // 设置下一次执行
                        this.timeoutId = setTimeout(executeAction, interval);
                    } catch (error) {
                        this.cleanup();
                        reject(error);
                    }
                };

                // 是否立即执行第一次
                if (context.immediate ?? this.options.defaultImmediate) {
                    executeAction();
                } else {
                    this.timeoutId = setTimeout(executeAction, interval);
                }
            });
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    executions: executionCount,
                    lastResult
                }
            };
        }
    }

    async compensate(context: IntervalActivityContext): Promise<void> {
        this.cleanup();
        
        // 如果action有补偿操作，执行它
        if (context.action.compensate) {
            await context.action.compensate(context);
        }
    }

    private cleanup() {
        this.isRunning = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}
