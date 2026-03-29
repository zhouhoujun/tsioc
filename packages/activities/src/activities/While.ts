import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface WhileActivityOptions {
    condition?: (context: ActivityContext) => Promise<boolean>;
    body?: Activity;
    maxIterations?: number;
    interval?: number;
}


@Directive({ selector: 'while' })
export class WhileActivity extends Activity {
    private isRunning = false;  // 添加运行状态标志

    
    /**
     * 循环条件函数
     */
    @Attribute() condition!: (context: ActivityContext) => Promise<boolean>;
    /**
     * 循环体活动
     */
    @Attribute() body!: Activity;
    /**
     * 最大迭代次数
     */
    @Attribute() maxIterations?: number;
    /**
     * 迭代间隔（毫秒）
     */
    @Attribute() interval?: number;

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
