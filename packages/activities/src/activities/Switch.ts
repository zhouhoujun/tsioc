import { Atteribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';
import { CaseActivity } from './Case';


@Component({ selector: 'switch' })
export class SwitchActivity<T> extends Activity {



    /**
     * case 活动列表
     */
    @Atteribute() cases: CaseActivity<T>[] = [];
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


    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (!this.cases || this.cases.length === 0) {
            return {
                success: false,
                error: new Error('No cases provided for switch activity')
            };
        }

        const breakOnMatch = this.breakOnMatch;
        const results: ActivityResult[] = [];
        const errors: Error[] = [];
        let matched = false;

        try {
            // 执行所有 case
            for (const caseActivity of this.cases) {
                const result = await caseActivity.execute(context);
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
            if (!matched && this.defaultActivity) {
                const defaultResult = await this.defaultActivity.execute(context);
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
            return {
                success: false,
                error: error as Error
            }
        }
    }

    async compensate(context: ActivityContext): Promise<void> {
        // 按相反顺序执行所有匹配的 case 的补偿操作
        const compensations: Promise<void>[] = [];

        // 找到最后一个匹配的 case
        let lastMatchedCase: CaseActivity<T> | undefined;

        // 如果有匹配的 case，执行其补偿操作
        if (lastMatchedCase?.compensate) {
            compensations.push(lastMatchedCase.compensate(context));
        }

        // 如果有默认活动且没有匹配的 case，执行其补偿操作
        if (!lastMatchedCase && this.defaultActivity?.compensate) {
            compensations.push(this.defaultActivity.compensate(context));
        }

        await Promise.all(compensations);
    }
} 