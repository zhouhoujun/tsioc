import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface DoWhileActivityOptions {
    defaultMaxIterations?: number;
    defaultInterval?: number;
}

export interface DoWhileActivityContext extends ActivityContext {
    /**
     * 循环条件
     */
    condition: () => Promise<boolean> | boolean;
    /**
     * 循环体活动
     */
    bodyActivity: Activity;
    /**
     * 最大迭代次数
     */
    maxIterations?: number;
    /**
     * 迭代间隔（毫秒）
     */
    interval?: number;
    /**
     * 迭代回调
     */
    onIteration?: (iteration: number, result: ActivityResult) => void;
}

export interface DoWhileActivityOptions {
    /**
     * 默认最大迭代次数
     */
    defaultMaxIterations?: number;
    /**
     * 默认迭代间隔
     */
    defaultInterval?: number;
}

@Injectable()
export class DoWhileActivity implements Activity {
    name = 'do_while';
    private isRunning = false;

    constructor(private options: DoWhileActivityOptions = {}) {
        this.options = {
            defaultMaxIterations: 100,
            defaultInterval: 0,
            ...options
        };
    }

    async execute(context: DoWhileActivityContext): Promise<ActivityResult> {
        if (!context.bodyActivity || !context.condition) {
            return {
                success: false,
                error: new Error('Missing required body activity or condition')
            };
        }

        const maxIterations = context.maxIterations ?? this.options.defaultMaxIterations;
        const interval = context.interval ?? this.options.defaultInterval!;
        let iteration = 0;
        let lastResult: ActivityResult | null = null;
        this.isRunning = true;

        try {
            do {
                // 检查最大迭代次数
                if (iteration >= maxIterations!) {
                    return {
                        success: false,
                        error: new Error(`Maximum iterations (${maxIterations}) reached`),
                        data: {
                            iterations: iteration,
                            lastResult
                        }
                    };
                }

                // 执行循环体活动
                lastResult = await context.bodyActivity.execute(context);
                
                // 调用迭代回调
                if (context.onIteration) {
                    context.onIteration(iteration, lastResult);
                }

                // 如果循环体执行失败，中断循环
                if (!lastResult.success) {
                    return {
                        success: false,
                        error: lastResult.error,
                        data: {
                            iterations: iteration,
                            lastResult
                        }
                    };
                }

                // 等待指定间隔
                if (interval > 0) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                }

                iteration++;
            } while (this.isRunning && await context.condition());

            return {
                success: true,
                data: {
                    iterations: iteration,
                    completed: true,
                    lastResult
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    iterations: iteration,
                    lastResult
                }
            };
        } finally {
            this.isRunning = false;
        }
    }

    async compensate(context: DoWhileActivityContext): Promise<void> {
        // 停止循环
        this.isRunning = false;

        // 如果循环体活动有补偿操作，执行它
        if (context.bodyActivity.compensate) {
            await context.bodyActivity.compensate(context);
        }
    }
}
