import { Atteribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';


// export interface WhileActivityContext extends ActivityContext {
//     /**
//      * 循环条件函数
//      */
//     condition: (context: ActivityContext) => Promise<boolean>;
//     /**
//      * 循环体活动
//      */
//     body: Activity;
//     /**
//      * 最大迭代次数
//      */
//     maxIterations?: number;
//     /**
//      * 迭代间隔（毫秒）
//      */
//     interval?: number;
//     /**
//      * 迭代回调函数
//      */
//     onIteration?: (iteration: number, result: ActivityResult) => void;
//     /**
//      * 错误处理函数
//      */
//     errorHandler?: (error: Error, iteration: number) => Promise<ActivityResult>;
//     /**
//      * 是否在错误时继续执行
//      */
//     continueOnError?: boolean;
//     /**
//      * 是否在条件不满足时抛出错误
//      */
//     throwOnConditionFalse?: boolean;
// }

// export interface WhileActivityOptions {
//     /**
//      * 默认最大迭代次数
//      */
//     defaultMaxIterations?: number;
//     /**
//      * 默认迭代间隔
//      */
//     defaultInterval?: number;
//     /**
//      * 默认是否在错误时继续执行
//      */
//     defaultContinueOnError?: boolean;
//     /**
//      * 默认是否在条件不满足时抛出错误
//      */
//     defaultThrowOnConditionFalse?: boolean;
// }

@Component({ selector: 'while' })
export class WhileActivity extends Activity {
    private isRunning = false;  // 添加运行状态标志

    
    /**
     * 循环条件函数
     */
    @Atteribute() condition!: (context: ActivityContext) => Promise<boolean>;
    /**
     * 循环体活动
     */
    @Atteribute() body!: Activity;
    /**
     * 最大迭代次数
     */
    @Atteribute() maxIterations?: number;
    /**
     * 迭代间隔（毫秒）
     */
    @Atteribute() interval?: number;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (!this.condition) {
            return {
                success: false,
                error: new Error('No condition provided for while loop')
            };
        }

        if (!this.body) {
            return {
                success: false,
                error: new Error('No body activity provided for while loop')
            };
        }

        this.isRunning = true;

        const maxIterations = this.maxIterations;
        const interval = this.interval ?? 0;
        // const continueOnError = this.continueOnError ?? this.options.defaultContinueOnError;
        // const throwOnConditionFalse = this.throwOnConditionFalse ?? this.options.defaultThrowOnConditionFalse;

        let iteration = 0;
        const results: ActivityResult[] = [];
        const errors: Error[] = [];

        try {
            while (this.isRunning && iteration < maxIterations!) {
                // 检查循环条件
                const shouldContinue = await this.condition(context);
                if (!shouldContinue) {
                    // if (throwOnConditionFalse) {
                    //     throw new Error(`Loop condition returned false at iteration ${iteration}`);
                    // }
                    break;
                }

                try {
                    const result = await this.body.execute(context);
                    results.push(result);
                    // context.onIteration?.(iteration, result);

                    // 优化错误处理逻辑
                    if (!result.success) {
                        errors.push(result.error!);
                        // if (!continueOnError) {
                        //     return this.createResult(false, result.error, iteration, results, errors);
                        // }
                    }

                    // 等待间隔
                    if (interval > 0 && this.isRunning) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }

                    iteration++;
                } catch (error) {
                    // 统一错误处理
                    const err = error as Error;
                    errors.push(err);
                    
                    // if (context.errorHandler) {
                    //     try {
                    //         const handledResult = await context.errorHandler(err, iteration);
                    //         results.push(handledResult);
                    //         if (!handledResult.success && !continueOnError) {
                    //             return this.createResult(false, handledResult.error, iteration, results, errors);
                    //         }
                    //     } catch (handlerError) {
                    //         errors.push(handlerError as Error);
                    //     }
                    // }

                    // if (!continueOnError) {
                    //     return this.createResult(false, err, iteration, results, errors);
                    // }
                }
            }

            // 统一结果返回
            if (iteration >= maxIterations!) {
                return this.createResult(false, new Error(`Maximum iterations (${maxIterations}) reached`), iteration, results, errors);
            }
            
            return this.createResult(errors.length === 0, undefined, iteration, results, errors.length ? errors : undefined);
        } finally {
            this.isRunning = false;
        }
    }

    private createResult(
        success: boolean,
        error?: Error,
        iteration?: number,
        results?: ActivityResult[],
        errors?: Error[]
    ): ActivityResult {
        return {
            success,
            error,
            data: {
                iteration,
                results,
                errors
            }
        };
    }

    async compensate(context: ActivityContext): Promise<void> {
        this.isRunning = false;  // 停止循环
        if (this.body?.compensate) {
            await this.body.compensate(context);
        }
    }
}
