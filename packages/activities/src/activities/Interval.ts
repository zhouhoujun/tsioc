import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface IntervalActivityOptions {
    interval?: number;
    body?: Activity;
    maxExecutions?: number;
    immediate?: boolean;
}

@Component({ selector: 'interval' })
export class IntervalActivity extends Activity {

    private isRunning = false;
    private timeoutId: NodeJS.Timeout | null = null;


    /**
     * 间隔时间（毫秒）
     */
    @Attribute() interval!: number;
    /**
     * 要执行的活动
     */
    @Attribute() body!: Activity;
    /**
     * 最大执行次数（可选，undefined表示无限执行）
     */
    @Attribute() maxExecutions: number | undefined;
    /**
     * 是否立即执行第一次
     */
    @Attribute() immediate = false;


    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (!this.body) {
            return {
                success: false,
                error: new Error('No action activity provided')
            };
        }

        if (this.interval < 0) {
            return {
                success: false,
                error: new Error('Invalid interval value')
            };
        }

        this.isRunning = true;
        let executionCount = 0;
        let lastResult: ActivityResult | null = null;

        try {
            return await new Promise<ActivityResult>((resolve, reject) => {
                const executeAction = async () => {
                    if (!this.isRunning) {
                        this.cleanup();
                        resolve({
                            success: true,
                            data: {
                                executions: executionCount,
                                interrupted: true,
                                lastResult
                            }
                        });
                        return;
                    }

                    try {
                        lastResult = await this.body.execute(context);
                        executionCount++;

                        // 检查是否达到最大执行次数
                        if (this.maxExecutions && executionCount >= this.maxExecutions) {
                            this.cleanup();
                            resolve({
                                success: true,
                                data: {
                                    executions: executionCount,
                                    completed: true,
                                    lastResult
                                }
                            });
                            return;
                        }

                        // 设置下一次执行
                        this.timeoutId = setTimeout(executeAction, this.interval);
                    } catch (error) {
                        this.cleanup();
                        reject(error);
                    }
                };

                // 是否立即执行第一次
                if (this.immediate) {
                    executeAction();
                } else {
                    this.timeoutId = setTimeout(executeAction, this.interval);
                }
            });
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    executions: executionCount,
                    lastResult
                }
            };
        }
    }

    async compensate(context: ActivityContext): Promise<void> {
        this.cleanup();
    }

    private cleanup() {
        this.isRunning = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}
