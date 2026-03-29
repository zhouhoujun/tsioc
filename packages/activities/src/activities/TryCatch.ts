import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';


export interface TryCatchActivityContext extends ActivityContext {
    /**
     * try 块中的活动
     */
    tryActivity: Activity;
    /**
     * catch 块中的活动
     */
    catchActivity?: Activity|null;
    /**
     * finally 块中的活动
     */
    finallyActivity?: Activity|null;
    /**
     * 错误类型过滤器
     */
    errorTypes?: (new (...args: any[]) => Error)[];
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error) => Promise<ActivityResult>;
    /**
     * 是否在 catch 块中重新抛出错误
     */
    rethrow?: boolean;
}

export interface TryCatchActivityOptions {
    /**
     * finally 块中的活动
     */
    finallyActivity?: Activity|null;
    /**
     * 默认错误类型过滤器
     */
    defaultErrorTypes?: (new (...args: any[]) => Error)[];
    /**
     * 默认是否重新抛出错误
     */
    defaultRethrow?: boolean;
}

@Directive({ selector: 'try_catch'})
export class TryCatchActivity extends Activity {

    /**
     * try 块中的活动
     */
    @Attribute() tryActivity!: Activity;
    /**
     * catch 块中的活动
     */
    @Attribute() catchActivity?: Activity|null;
    /**
     * finally 块中的活动
     */
    @Attribute() finallyActivity?: Activity|null;
    /**
     * 错误类型过滤器
     */
    @Attribute() errorTypes?: (new (...args: any[]) => Error)[];


    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (!this.tryActivity) {
            return {
                success: false,
                error: new Error('Try activity is required')
            };
        }

        let tryResult: ActivityResult | null = null;
        let catchResult: ActivityResult | null = null;
        let finallyResult: ActivityResult | null = null;
        let finallyErrorResult: ActivityResult | null = null;

        try {
            // 执行 try 块
            tryResult = await this.tryActivity.execute(context);
        } catch (error) {
            const caughtError = error as Error;

            // 检查错误类型是否匹配
            const errorTypes = this.errorTypes;
            const shouldCatch = !errorTypes || errorTypes.length === 0 || errorTypes.some(errorType => 
                caughtError instanceof errorType
            );

            if (shouldCatch && this.catchActivity) {
                // 执行 catch 块
                try {
                    catchResult = await this.catchActivity.execute({
                        ...context,
                        error: caughtError
                    });

                    // // 如果配置了重新抛出，则抛出错误
                    // if (this.rethrow ?? this.options.defaultRethrow) {
                    //     throw caughtError;
                    // }
                } catch (catchError) {
                    return {
                        success: false,
                        error: catchError as Error,
                        data: {
                            tryResult,
                            catchError: catchError as Error
                        }
                    };
                }
            } else {
                // 错误类型不匹配或没有 catch 块，重新抛出错误
                throw caughtError;
            }
        } finally {
            // 执行 finally 块
            if (this.finallyActivity) {
                try {
                    finallyResult = await this.finallyActivity.execute(context);
                } catch (finallyError) {
                    finallyErrorResult = {
                        success: false,
                        error: finallyError as Error,
                        data: {
                            tryResult,
                            catchResult,
                            finallyError: finallyError as Error
                        }
                    } as ActivityResult;
                }
            }
        }
        if(finallyErrorResult) {
            return finallyErrorResult;
        }

        // // 如果有自定义错误处理器，使用它处理任何错误
        // if (context.errorHandler) {
        //     const error = tryResult?.error || catchResult?.error || finallyResult?.error;
        //     if (error) {
        //         try {
        //             return await context.errorHandler(error);
        //         } catch (handlerError) {
        //             return {
        //                 success: false,
        //                 error: handlerError as Error,
        //                 data: {
        //                     tryResult,
        //                     catchResult,
        //                     finallyResult,
        //                     handlerError: handlerError as Error
        //                 }
        //             };
        //         }
        //     }
        // }

        // 返回执行结果
        return {
            success: Boolean(tryResult?.success || catchResult?.success),
            error: tryResult?.error || catchResult?.error || finallyResult?.error,
            data: {
                tryResult,
                catchResult,
                finallyResult
            }
        };
    }

    async compensate(context: TryCatchActivityContext): Promise<void> {
        // 按相反顺序执行补偿操作
        const compensations: Promise<void>[] = [];

        if (context.finallyActivity?.compensate) {
            compensations.push(context.finallyActivity.compensate(context));
        }
        if (context.catchActivity?.compensate) {
            compensations.push(context.catchActivity.compensate(context));
        }
        if (context.tryActivity?.compensate) {
            compensations.push(context.tryActivity.compensate(context));
        }

        await Promise.all(compensations);
    }
}
