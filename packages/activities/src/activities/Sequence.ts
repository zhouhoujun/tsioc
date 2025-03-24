import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface SequenceActivityContext extends ActivityContext {
    /**
     * 要按顺序执行的活动列表
     */
    activities: Activity[];
    /**
     * 是否在错误时继续执行
     */
    continueOnError?: boolean;
    /**
     * 活动执行回调
     */
    onActivityComplete?: (activity: Activity, result: ActivityResult) => void;
    /**
     * 错误处理函数
     */
    errorHandler?: (activity: Activity, error: Error) => Promise<ActivityResult>;
}

export interface SequenceActivityOptions {
    /**
     * 默认是否在错误时继续执行
     */
    defaultContinueOnError?: boolean;
}

@Injectable()
export class SequenceActivity implements Activity<SequenceActivityContext> {
    name = 'sequence';

    constructor(private options: SequenceActivityOptions = {}) {
        this.options = {
            defaultContinueOnError: false,
            ...options
        };
    }

    async execute(context: SequenceActivityContext): Promise<ActivityResult> {
        if (!context.activities || context.activities.length === 0) {
            return {
                success: true,
                data: { completed: true }
            };
        }

        const continueOnError = context.continueOnError ?? this.options.defaultContinueOnError;
        const results: Map<Activity, ActivityResult> = new Map();
        const errors: Error[] = [];
        let currentIndex = 0;

        try {
            for (const activity of context.activities) {
                try {
                    const result = await this.executeActivity(activity, context);
                    results.set(activity, result);

                    // 如果活动执行失败且不继续执行，返回错误
                    if (!result.success && !continueOnError) {
                        return {
                            success: false,
                            error: result.error,
                            data: {
                                completed: false,
                                results,
                                errors: [result.error!],
                                lastActivity: activity.name
                            }
                        };
                    }

                    // 如果活动执行失败且继续执行，收集错误
                    if (!result.success) {
                        errors.push(result.error!);
                    }

                    currentIndex++;
                } catch (error) {
                    // 如果有自定义错误处理器，使用它
                    if (context.errorHandler) {
                        try {
                            const handledResult = await context.errorHandler(activity, error as Error);
                            results.set(activity, handledResult);
                            
                            if (!handledResult.success && !continueOnError) {
                                return {
                                    success: false,
                                    error: handledResult.error,
                                    data: {
                                        completed: false,
                                        results,
                                        errors: [handledResult.error!],
                                        lastActivity: activity.name
                                    }
                                };
                            }
                        } catch (handlerError) {
                            errors.push(handlerError as Error);
                        }
                    } else {
                        errors.push(error as Error);
                    }

                    // 如果不继续执行，返回错误
                    if (!continueOnError) {
                        return {
                            success: false,
                            error: error as Error,
                            data: {
                                completed: false,
                                results,
                                errors,
                                lastActivity: activity.name
                            }
                        };
                    }
                }
            }

            // 检查是否所有活动都完成
            const allCompleted = currentIndex === context.activities.length;
            const hasErrors = errors.length > 0;

            return {
                success: !hasErrors,
                data: {
                    completed: allCompleted,
                    results,
                    errors: hasErrors ? errors : undefined,
                    lastActivity: context.activities[currentIndex - 1]?.name
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    completed: false,
                    results,
                    errors: [error as Error],
                    lastActivity: context.activities[currentIndex]?.name
                }
            };
        }
    }

    private async executeActivity(
        activity: Activity,
        context: SequenceActivityContext
    ): Promise<ActivityResult> {
        const result = await activity.execute(context);
        context.onActivityComplete?.(activity, result);
        return result;
    }

    async compensate(context: SequenceActivityContext): Promise<void> {
        // 按相反顺序执行所有活动的补偿操作
        const compensations = [...context.activities]
            .reverse()
            .filter(activity => activity.compensate)
            .map(activity => activity.compensate!(context));

        await Promise.all(compensations);
    }
}
