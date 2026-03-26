import { Component, Attribute } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface TimerActivityOptions {
    type?: 'timeout' | 'interval' | 'date';
    delay?: number;
    targetDate?: Date;
    interval?: number;
    maxRepeats?: number;
    immediate?: boolean;
    body?: Activity;
}

@Component({ selector: 'timer' })
export class TimerActivity extends Activity {

    private timerId: any = null;
    private intervalId: any = null;
    private isRunning = false;

    /**
     * 定时器类型：'timeout' | 'interval' | 'date'
     */
    @Attribute() type!: 'timeout' | 'interval' | 'date';
    /**
     * 延迟时间（毫秒，用于 timeout 和 interval）
     */
    @Attribute() delay?: number;
    /**
     * 目标日期（用于 date 类型）
     */
    @Attribute() targetDate?: Date;
    /**
     * 重复间隔（毫秒，用于 interval）
     */
    @Attribute() interval?: number;
    /**
     * 最大重复次数（用于 interval）
     */
    @Attribute() maxRepeats?: number;
    /**
     * 是否立即执行第一次（用于 interval）
     */
    @Attribute() immediate?: boolean;


    @Attribute() body!: Activity;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (!this.type) {
            return {
                success: false,
                error: new Error('Timer type is required')
            };
        }

        this.isRunning = true;
        const executionCount = 0;

        try {
            switch (this.type) {
                case 'timeout':
                    return await this.executeTimeout(context);
                case 'interval':
                    return await this.executeInterval(context, executionCount);
                case 'date':
                    return await this.executeDate(context);
                default:
                    return {
                        success: false,
                        error: new Error(`Unsupported timer type: ${this.type}`)
                    };
            }
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    type: this.type,
                    executionCount
                }
            };
        }
    }

    private async executeTimeout(context: ActivityContext): Promise<ActivityResult> {
        const delay = this.delay;
        
        return new Promise<ActivityResult>((resolve) => {
            this.timerId = setTimeout(async () => {
                try {
                    // if (context.callback) {
                    //     await context.callback(context);
                    // }
                    // context.onComplete?.();
                    resolve({
                        success: true,
                        data: {
                            type: 'timeout',
                            delay,
                            executed: true
                        }
                    });
                } catch (error) {
                    resolve({
                        success: false,
                        error: error as Error,
                        data: {
                            type: 'timeout',
                            delay,
                            executed: false
                        }
                    });
                }
            }, delay);
        });
    }

    private async executeInterval(
        context: ActivityContext,
        executionCount: number
    ): Promise<ActivityResult> {
        const interval = this.interval;
        const immediate = this.immediate;
        const maxRepeats = this.maxRepeats;

        return new Promise<ActivityResult>((resolve) => {
            const executeInterval = async () => {
                if (!this.isRunning) {
                    this.cleanup();
                    resolve({
                        success: true,
                        data: {
                            type: 'interval',
                            interval,
                            executionCount,
                            interrupted: true
                        }
                    });
                    return;
                }

                try {
                    await this.body.execute(context);
                    executionCount++;

                    if (maxRepeats && executionCount >= maxRepeats) {
                        this.cleanup();
                        // context.onComplete?.();
                        resolve({
                            success: true,
                            data: {
                                type: 'interval',
                                interval,
                                executionCount,
                                completed: true
                            }
                        });
                        return;
                    }

                    this.intervalId = setTimeout(executeInterval, interval);
                } catch (error) {
                    this.cleanup();
                    resolve({
                        success: false,
                        error: error as Error,
                        data: {
                            type: 'interval',
                            interval,
                            executionCount
                        }
                    });
                }
            };

            if (immediate) {
                executeInterval();
            } else {
                this.intervalId = setTimeout(executeInterval, interval);
            }
        });
    }

    private async executeDate(context: ActivityContext): Promise<ActivityResult> {
        if (!this.targetDate) {
            return {
                success: false,
                error: new Error('Target date is required for date timer type')
            };
        }

        const now = Date.now();
        const targetTime = this.targetDate.getTime();
        const delay = Math.max(0, targetTime - now);

        if (delay === 0) {
            try {
                // if (context.callback) {
                //     await context.callback(context);
                // }
                // context.onComplete?.();
                return {
                    success: true,
                    data: {
                        type: 'date',
                        targetDate: this.targetDate,
                        executed: true
                    }
                };
            } catch (error) {
                return {
                    success: false,
                    error: error as Error,
                    data: {
                        type: 'date',
                        targetDate: this.targetDate,
                        executed: false
                    }
                };
            }
        }

        return new Promise<ActivityResult>((resolve) => {
            this.timerId = setTimeout(async () => {
                try {
                    // if (context.callback) {
                    //     await context.callback(context);
                    // }
                    // context.onComplete?.();
                    resolve({
                        success: true,
                        data: {
                            type: 'date',
                            targetDate: this.targetDate,
                            executed: true
                        }
                    });
                } catch (error) {
                    resolve({
                        success: false,
                        error: error as Error,
                        data: {
                            type: 'date',
                            targetDate: this.targetDate,
                            executed: false
                        }
                    });
                }
            }, delay);
        });
    }

    async compensate(context: ActivityContext): Promise<void> {
        this.cleanup();
    }

    private cleanup() {
        this.isRunning = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
