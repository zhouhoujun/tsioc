import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';
import { Attribute, Component } from '@tsdi/components';

export interface ParallelActivityContext extends ActivityContext {
    /**
     * 要并行执行的活动列表
     */
    activities: Activity[];
    /**
     * 最大并发数
     */
    maxConcurrent?: number;
    /**
     * 是否等待所有活动完成
     */
    waitAll?: boolean;
    /**
     * 活动执行回调
     */
    onActivityComplete?: (activity: Activity, result: ActivityResult) => void;
    /**
     * 错误处理策略
     */
    errorStrategy?: 'continue' | 'stop' | 'throw';
}

export interface ParallelActivityOptions {
    /**
     * 默认最大并发数
     */
    defaultMaxConcurrent?: number;
    /**
     * 默认错误处理策略
     */
    defaultErrorStrategy?: 'continue' | 'stop' | 'throw';
}

@Component({ selector: 'parallel' })
export class ParallelActivity extends Activity {
   
    /**
     * 要并行执行的活动列表
     */
    @Attribute() activities: Activity[] = [];

     /**
     * 最大并发数
     */
    @Attribute() maxConcurrent!: number;
    /**
     * 是否等待所有活动完成
     */
    @Attribute() waitAll = true;
    /**
     * 错误处理策略
     */
    @Attribute() errorStrategy: 'continue' | 'stop' | 'throw' = 'continue';

    async execute(context: ParallelActivityContext): Promise<ActivityResult> {
        if (!context.activities || context.activities.length === 0) {
            return {
                success: true,
                data: { completed: true }
            };
        }

        const maxConcurrent = this.maxConcurrent ?? 5;
        const errorStrategy = this.errorStrategy;
        const waitAll = this.waitAll;

        const results: Map<Activity, ActivityResult> = new Map();
        const errors: Error[] = [];
        let completedCount = 0;

        try {
            // 创建活动执行队列
            const queue = [...this.activities];
            const running = new Set<Promise<void>>();

            while (queue.length > 0 || running.size > 0) {
                // 填充运行中的活动直到达到最大并发数
                while (queue.length > 0 && running.size < maxConcurrent!) {
                    const activity = queue.shift()!;
                    const promise = this.executeActivity(activity, context, results);
                    running.add(promise);

                    promise.then(() => {
                        running.delete(promise);
                        completedCount++;
                    }).catch(error => {
                        running.delete(promise);
                        completedCount++;
                        errors.push(error);
                    });
                }

                // 等待至少一个活动完成
                if (running.size > 0) {
                    await Promise.race(running);
                }

                // 根据错误策略决定是否继续
                if (errors.length > 0) {
                    switch (errorStrategy) {
                        case 'stop':
                            return {
                                success: false,
                                error: errors[0],
                                data: {
                                    completed: false,
                                    results,
                                    errors
                                }
                            };
                        case 'throw':
                            throw errors[0];
                    }
                }
            }

            // 检查是否所有活动都完成
            const allCompleted = completedCount === context.activities.length;
            const hasErrors = errors.length > 0;

            return {
                success: !hasErrors,
                data: {
                    completed: allCompleted,
                    results,
                    errors: hasErrors ? errors : undefined
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    completed: false,
                    results,
                    errors: [error as Error]
                }
            };
        }
    }

    private async executeActivity(
        activity: Activity,
        context: ParallelActivityContext,
        results: Map<Activity, ActivityResult>
    ): Promise<void> {
        try {
            const result = await activity.execute(context);
            results.set(activity, result);
            context.onActivityComplete?.(activity, result);
        } catch (error) {
            const errorResult: ActivityResult = {
                success: false,
                error: error as Error
            };
            results.set(activity, errorResult);
            context.onActivityComplete?.(activity, errorResult);
            throw error;
        }
    }

    async compensate(context: ParallelActivityContext): Promise<void> {
        // 并行执行所有活动的补偿操作
        const compensations = context.activities
            .filter(activity => activity.compensate)
            .map(activity => activity.compensate!(context));

        await Promise.all(compensations);
    }
}
