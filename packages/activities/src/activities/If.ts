import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface IfActivityContext extends ActivityContext {
    /**
     * 条件函数
     */
    condition: (context: ActivityContext) => Promise<boolean>;
    /**
     * 条件为 true 时执行的活动
     */
    thenActivity: Activity;
    /**
     * 条件为 false 时执行的活动
     */
    elseActivity?: Activity;
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error) => Promise<ActivityResult>;
}

export interface IfActivityOptions {
    /**
     * 默认错误处理函数
     */
    defaultErrorHandler?: (error: Error) => Promise<ActivityResult>;
}

@Injectable()
export class IfActivity implements Activity<IfActivityContext> {
    name = 'if';

    constructor(private options: IfActivityOptions = {}) {
        this.options = {
            defaultErrorHandler: async (error: Error) => ({
                success: false,
                error,
                data: { condition: false }
            }),
            ...options
        };
    }

    async execute(context: IfActivityContext): Promise<ActivityResult> {
        if (!context.condition) {
            return {
                success: false,
                error: new Error('No condition provided for if activity')
            };
        }

        if (!context.thenActivity) {
            return {
                success: false,
                error: new Error('No then activity provided for if activity')
            };
        }

        try {
            // 评估条件
            const conditionResult = await context.condition(context);

            // 根据条件选择要执行的活动
            const activityToExecute = conditionResult ? context.thenActivity : context.elseActivity;

            // 如果没有 else 活动且条件为 false，返回成功结果
            if (!activityToExecute) {
                return {
                    success: true,
                    data: { condition: false }
                };
            }

            // 执行选定的活动
            const result = await activityToExecute.execute(context);
            return {
                success: result.success,
                error: result.error,
                data: {
                    condition: conditionResult,
                    result: result.data
                }
            };
        } catch (error) {
            // 如果有自定义错误处理器，使用它
            if (context.errorHandler) {
                try {
                    return await context.errorHandler(error as Error);
                } catch (handlerError) {
                    return {
                        success: false,
                        error: handlerError as Error,
                        data: {
                            originalError: error,
                            handlerError: handlerError
                        }
                    };
                }
            }

            // 使用默认错误处理器
            return await this.options.defaultErrorHandler!(error as Error);
        }
    }

    async compensate(context: IfActivityContext): Promise<void> {
        // 根据条件执行补偿操作
        const conditionResult = await context.condition(context);
        const activityToCompensate = conditionResult ? context.thenActivity : context.elseActivity;

        if (activityToCompensate?.compensate) {
            await activityToCompensate.compensate(context);
        }
    }
} 