import { Invocation, isFunction, isString, AbstractType } from '@tsdi/ioc';
import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export type InvokeFn = (context: ActivityContext, ...args: any[]) => Promise<any>;

export interface InvokeActivityOptions {
    target?: AbstractType | Invocation;
    invoke?: string | InvokeFn;
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
}

@Component({ selector: 'invoke' })
export class InvokeActivity extends Activity {


    @Attribute() target: AbstractType | Invocation| undefined;
    @Attribute() invoke!: string | InvokeFn;
    @Attribute() maxAttempts!: number;
    @Attribute() delay!: number;
    @Attribute() backoff!: number;



    async execute(context: ActivityContext): Promise<ActivityResult> {

        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < this.maxAttempts!) {
            try {
                // 如果不是第一次尝试，等待指定延迟
                if (attempt > 0) {
                    const delay = this.delay! * Math.pow(this.backoff!, attempt - 1);
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

                // // 如果有自定义错误处理器，使用它
                // if (context.errorHandler) {
                //     try {
                //         const handledResult = await context.errorHandler(lastError);
                //         if (handledResult) {
                //             return handledResult;
                //         }
                //     } catch (handlerError) {
                //         // 错误处理器也失败了，继续重试
                //         console.error('Error handler failed:', handlerError);
                //     }
                // }

                // 如果是最后一次尝试，返回错误
                if (attempt >= this.maxAttempts!) {
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

    private async invokeTarget(context: ActivityContext): Promise<any> {
        let result: any;

        if (this.target && isString(this.invoke)) {
            const invocation = this.target as Invocation;
            // 调用活动
            const activityResult = await invocation.invoke(this.invoke, context);
            if (!activityResult.success) {
                throw activityResult.error || new Error('Activity execution failed');
            }
            result = activityResult.data;
        } else if(isFunction(this.invoke)) {
            // 调用函数
            result = await this.invoke(context);
        }

        // // 如果有结果转换函数，使用它
        // if (context.resultMapper) {
        //     result = context.resultMapper(result);
        // }

        return result;
    }

    // private isActivity(target: Activity | InvokeFn): target is Activity {
    //     return typeof (target as Activity).execute === 'function';
    // }

    // async compensate(context: ActivityContext): Promise<void> {
    //     if (this.isActivity(context.target) && context.target.compensate) {
    //         await context.target.compensate(context);
    //     }
    // }
}
