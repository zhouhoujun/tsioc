import { Atteribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';


@Component({ selector: 'sequence' })
export class SequenceActivity extends Activity {

    /**
     * 要按顺序执行的活动列表
     */
    @Atteribute() activities: Activity[] = [];
    /**
     * 是否在错误时继续执行
     */
    @Atteribute() continueOnError?: boolean;

    @Atteribute() onError?: (error: Error) =>  Promise<ActivityResult>;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (!this.activities || this.activities.length === 0) {
            return {
                success: true,
                data: { completed: true }
            };
        }

        const continueOnError = this.continueOnError;
        const results: Map<Activity, ActivityResult> = new Map();
        const errors: Error[] = [];
        let currentIndex = 0;

        try {
            for (const activity of this.activities) {
                try {
                    const result = await activity.execute(context);
                    results.set(activity, result);

                    // 如果活动执行失败且不继续执行，返回错误
                    if (!result.success && !continueOnError) {
                        return {
                            success: false,
                            error: result.error,
                            data: {
                                completed: false,
                                results,
                                errors: [result.error!],
                                lastActivity: activity
                            }
                        };
                    }

                    // 如果活动执行失败且继续执行，收集错误
                    if (!result.success) {
                        errors.push(result.error!);
                    }

                    currentIndex++;
                } catch (error) {
                    // 如果有自定义错误处理器，使用它
                    if (this.onError) {
                        try {
                            const handledResult = await this.onError(error as Error);
                            results.set(activity, handledResult);
                            
                            if (!handledResult.success && !continueOnError) {
                                return {
                                    success: false,
                                    error: handledResult.error,
                                    data: {
                                        completed: false,
                                        results,
                                        errors: [handledResult.error!],
                                        lastActivity: activity
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
                                completed: false,
                                results,
                                errors,
                                lastActivity: activity
                            }
                        };
                    }
                }
            }

            // 检查是否所有活动都完成
            const allCompleted = currentIndex === this.activities.length;
            const hasErrors = errors.length > 0;

            return {
                success: !hasErrors,
                data: {
                    completed: allCompleted,
                    results,
                    errors: hasErrors ? errors : undefined,
                    lastActivity: this.activities[currentIndex - 1]
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    completed: false,
                    results,
                    errors: [error as Error],
                    lastActivity: this.activities[currentIndex]
                }
            };
        }
    }


    async compensate(context: ActivityContext): Promise<void> {
        // 按相反顺序执行所有活动的补偿操作
        const compensations =this.activities
            .reverse()
            .filter(activity => activity.compensate)
            .map(activity => activity.compensate!(context));

        await Promise.all(compensations);
    }
}
