import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';
import { CaseActivity, CaseActivityContext } from './Case';

export interface SwitchActivityContext extends ActivityContext {
    /**
     * case 活动列表
     */
    cases: CaseActivity[];
    /**
     * 默认活动（当所有 case 都不匹配时执行）
     */
    defaultActivity?: Activity;
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error) => Promise<ActivityResult>;
    /**
     * 是否在第一个匹配的 case 后停止执行
     */
    breakOnMatch?: boolean;
}

export interface SwitchActivityOptions {
    /**
     * 默认是否在第一个匹配的 case 后停止执行
     */
    defaultBreakOnMatch?: boolean;
    /**
     * 默认错误处理函数
     */
    defaultErrorHandler?: (error: Error) => Promise<ActivityResult>;
}

@Injectable()
export class SwitchActivity implements Activity<SwitchActivityContext> {
    name = 'switch';

    constructor(private options: SwitchActivityOptions = {}) {
        this.options = {
            defaultBreakOnMatch: true,
            defaultErrorHandler: async (error: Error) => ({
                success: false,
                error,
                data: { matched: false }
            }),
            ...options
        };
    }

    async execute(context: SwitchActivityContext): Promise<ActivityResult> {
        if (!context.cases || context.cases.length === 0) {
            return {
                success: false,
                error: new Error('No cases provided for switch activity')
            };
        }

        const breakOnMatch = context.breakOnMatch ?? this.options.defaultBreakOnMatch;
        const results: ActivityResult[] = [];
        const errors: Error[] = [];
        let matched = false;

        try {
            // 执行所有 case
            for (const caseActivity of context.cases) {
                const caseContext: CaseActivityContext = {
                    ...context,
                    condition: caseActivity.condition,
                    activity: caseActivity.activity
                };
                const result = await caseActivity.execute(caseContext);
                results.push(result);

                // 检查是否有匹配的 case
                if (result.data?.matched) {
                    matched = true;
                    if (breakOnMatch) {
                        break;
                    }
                }

                // 如果 case 执行失败，收集错误
                if (!result.success) {
                    errors.push(result.error!);
                }
            }

            // 如果没有匹配的 case 且有默认活动，执行默认活动
            if (!matched && context.defaultActivity) {
                const defaultResult = await context.defaultActivity.execute(context);
                results.push(defaultResult);

                if (!defaultResult.success) {
                    errors.push(defaultResult.error!);
                }
            }

            // 返回执行结果
            return {
                success: errors.length === 0,
                error: errors.length > 0 ? errors[0] : undefined,
                data: {
                    matched,
                    results,
                    errors: errors.length > 0 ? errors : undefined
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
                            handlerError: handlerError,
                            results,
                            errors
                        }
                    };
                }
            }

            // 使用默认错误处理器
            return await this.options.defaultErrorHandler!(error as Error);
        }
    }

    async compensate(context: SwitchActivityContext): Promise<void> {
        // 按相反顺序执行所有匹配的 case 的补偿操作
        const compensations: Promise<void>[] = [];

        // 找到最后一个匹配的 case
        let lastMatchedCase: CaseActivity | undefined;
        for (const caseActivity of context.cases) {
            const caseContext: CaseActivityContext = {
                ...context,
                condition: caseActivity.condition,
                activity: caseActivity.activity
            };
            const result = await caseActivity.execute(caseContext);
            if (result.data?.matched) {
                lastMatchedCase = caseActivity;
            }
        }

        // 如果有匹配的 case，执行其补偿操作
        if (lastMatchedCase?.compensate) {
            const caseContext: CaseActivityContext = {
                ...context,
                condition: lastMatchedCase.condition,
                activity: lastMatchedCase.activity
            };
            compensations.push(lastMatchedCase.compensate(caseContext));
        }

        // 如果有默认活动且没有匹配的 case，执行其补偿操作
        if (!lastMatchedCase && context.defaultActivity?.compensate) {
            compensations.push(context.defaultActivity.compensate(context));
        }

        await Promise.all(compensations);
    }
} 