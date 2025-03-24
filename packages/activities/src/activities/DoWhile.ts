import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface DoWhileActivityContext extends ActivityContext {
    /**
     * 循环体活动
     */
    body: Activity;
    /**
     * 循环条件函数
     */
    condition: (context: ActivityContext) => Promise<boolean>;
    /**
     * 最大迭代次数
     */
    maxIterations?: number;
    /**
     * 迭代间隔（毫秒）
     */
    interval?: number;
    /**
     * 迭代回调函数
     */
    onIteration?: (iteration: number, result: ActivityResult) => void;
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error, iteration: number) => Promise<ActivityResult>;
    /**
     * 是否在错误时继续执行
     */
    continueOnError?: boolean;
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
    /**
     * 默认是否在错误时继续执行
     */
    defaultContinueOnError?: boolean;
}

@Injectable()
export class DoWhileActivity implements Activity<DoWhileActivityContext> {
    name = 'do_while';

    constructor(private options: DoWhileActivityOptions = {}) {
        this.options = {
            defaultMaxIterations: 1000,
            defaultInterval: 0,
            defaultContinueOnError: false,
            ...options
        };
    }

    async execute(context: DoWhileActivityContext): Promise<ActivityResult> {
        if (!context.body) {
            return {
                success: false,
                error: new Error('No body activity provided for do-while loop')
            };
        }

        if (!context.condition) {
            return {
                success: false,
                error: new Error('No condition provided for do-while loop')
            };
        }

        const maxIterations = context.maxIterations ?? this.options.defaultMaxIterations;
        const interval = context.interval ?? this.options.defaultInterval ?? 0;
        const continueOnError = context.continueOnError ?? this.options.defaultContinueOnError;

        let iteration = 0;
        const results: ActivityResult[] = [];
        const errors: Error[] = [];

        try {
            do {
                try {
                    // 执行循环体
                    const result = await context.body.execute(context);
                    results.push(result);

                    // 调用迭代回调
                    context.onIteration?.(iteration, result);

                    // 如果活动执行失败且不继续执行，返回错误
                    if (!result.success && !continueOnError) {
                        return {
                            success: false,
                            error: result.error,
                            data: {
                                iteration,
                                results,
                                errors
                            }
                        };
                    }

                    // 如果活动执行失败且继续执行，收集错误
                    if (!result.success) {
                        errors.push(result.error!);
                    }

                    // 等待指定的间隔时间
                    if (interval > 0) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }

                    iteration++;

                    // 检查是否达到最大迭代次数
                    if (iteration >= maxIterations!) {
                        return {
                            success: false,
                            error: new Error(`Maximum iterations (${maxIterations}) reached`),
                            data: {
                                iteration,
                                results,
                                errors
                            }
                        };
                    }

                    // 检查循环条件
                    const shouldContinue = await context.condition(context);
                    if (!shouldContinue) {
                        break;
                    }
                } catch (error) {
                    // 如果有自定义错误处理器，使用它
                    if (context.errorHandler) {
                        try {
                            const handledResult = await context.errorHandler(error as Error, iteration);
                            results.push(handledResult);

                            if (!handledResult.success && !continueOnError) {
                                return {
                                    success: false,
                                    error: handledResult.error,
                                    data: {
                                        iteration,
                                        results,
                                        errors
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
                                iteration,
                                results,
                                errors
                            }
                        };
                    }
                }
            } while (iteration < maxIterations!);

            // 返回执行结果
            return {
                success: errors.length === 0,
                data: {
                    iteration,
                    results,
                    errors: errors.length > 0 ? errors : undefined
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    iteration,
                    results,
                    errors
                }
            };
        }
    }

    async compensate(context: DoWhileActivityContext): Promise<void> {
        // 如果需要，实现补偿逻辑
        // 例如：清理临时文件、回滚数据库事务等
    }
}
