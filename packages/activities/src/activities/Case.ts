import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface CaseActivityContext extends ActivityContext {
    /**
     * 条件函数
     */
    condition: (context: ActivityContext) => Promise<boolean>;
    /**
     * 要执行的活动
     */
    activity: Activity;
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error) => Promise<ActivityResult>;
}

export interface CaseActivityOptions {
    /**
     * 默认错误处理函数
     */
    defaultErrorHandler?: (error: Error) => Promise<ActivityResult>;
}

@Injectable()
export class CaseActivity implements Activity<CaseActivityContext> {
    name = 'case';
    condition: (context: ActivityContext) => Promise<boolean>;
    activity: Activity;

    constructor(
        condition: (context: ActivityContext) => Promise<boolean>,
        activity: Activity,
        private options: CaseActivityOptions = {}
    ) {
        this.condition = condition;
        this.activity = activity;
        this.options = {
            defaultErrorHandler: async (error: Error) => ({
                success: false,
                error,
                data: { matched: false }
            }),
            ...options
        };
    }

    async execute(context: CaseActivityContext): Promise<ActivityResult> {
        if (!context.condition) {
            return {
                success: false,
                error: new Error('No condition provided for case activity')
            };
        }

        if (!context.activity) {
            return {
                success: false,
                error: new Error('No activity provided for case activity')
            };
        }

        try {
            // 评估条件
            const matched = await context.condition(context);

            // 如果条件不匹配，返回未匹配结果
            if (!matched) {
                return {
                    success: true,
                    data: { matched: false }
                };
            }

            // 执行活动
            const result = await context.activity.execute(context);
            return {
                success: result.success,
                error: result.error,
                data: {
                    matched: true,
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

    async compensate(context: CaseActivityContext): Promise<void> {
        // 如果条件匹配，执行补偿操作
        const matched = await context.condition(context);
        if (matched && context.activity.compensate) {
            await context.activity.compensate(context);
        }
    }
} 