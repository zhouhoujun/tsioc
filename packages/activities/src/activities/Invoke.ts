import { Empty, Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export type InvokeFn = (context: ActivityContext, ...args: any[]) => Promise<any>;

export interface InvokeActivityContext extends ActivityContext {
    /**
     * 要调用的活动或函数
     */
    target: Activity | InvokeFn;
    /**
     * 调用参数
     */
    args?: any[];
    /**
     * 结果转换函数
     */
    resultMapper?: (result: any) => any;
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error) => Promise<ActivityResult>;
    /**
     * 重试配置
     */
    retry?: {
        maxAttempts: number;
        delay: number;
        backoff?: number;
    };
}

export interface InvokeActivityOptions {
    /**
     * 默认重试配置
     */
    defaultRetry?: {
        maxAttempts: number;
        delay: number;
        backoff: number;
    };
}

@Injectable()
export class InvokeActivity implements Activity<InvokeActivityContext> {
    name = 'invoke';

    constructor(private options: InvokeActivityOptions = {}) {
        this.options = {
            defaultRetry: {
                maxAttempts: 3,
                delay: 1000,
                backoff: 2
            },
            ...options
        };
    }

    async execute(context: InvokeActivityContext): Promise<ActivityResult> {
        if (!context.target) {
            return {
                success: false,
                error: new Error('No target activity or function provided')
            };
        }

        const retry = {
            ...this.options.defaultRetry,
            ...context.retry
        };

        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < retry.maxAttempts!) {
            try {
                // 如果不是第一次尝试，等待指定延迟
                if (attempt > 0) {
                    const delay = retry.delay! * Math.pow(retry.backoff!, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                const result = await this.invokeTarget(context);
                return {
                    success: true,
                    data: result
                };
            } catch (error) {
                lastError = error as Error;
                attempt++;

                // 如果有自定义错误处理器，使用它
                if (context.errorHandler) {
                    try {
                        const handledResult = await context.errorHandler(lastError);
                        if (handledResult) {
                            return handledResult;
                        }
                    } catch (handlerError) {
                        // 错误处理器也失败了，继续重试
                        console.error('Error handler failed:', handlerError);
                    }
                }

                // 如果是最后一次尝试，返回错误
                if (attempt >= retry.maxAttempts!) {
                    return {
                        success: false,
                        error: lastError,
                        data: {
                            attempts: attempt,
                            lastError
                        }
                    };
                }
            }
        }

        // 这里正常不会执行到，为了 TypeScript 类型检查
        return {
            success: false,
            error: new Error('Unexpected execution path')
        };
    }

    private async invokeTarget(context: InvokeActivityContext): Promise<any> {
        let result: any;

        if (this.isActivity(context.target)) {
            // 调用活动
            const activityResult = await context.target.execute(context);
            if (!activityResult.success) {
                throw activityResult.error || new Error('Activity execution failed');
            }
            result = activityResult.data;
        } else {
            // 调用函数
            result = await context.target(context, ...(context.args || Empty));
        }

        // 如果有结果转换函数，使用它
        if (context.resultMapper) {
            result = context.resultMapper(result);
        }

        return result;
    }

    private isActivity(target: Activity | InvokeFn): target is Activity {
        return typeof (target as Activity).execute === 'function';
    }

    async compensate(context: InvokeActivityContext): Promise<void> {
        if (this.isActivity(context.target) && context.target.compensate) {
            await context.target.compensate(context);
        }
    }
}
