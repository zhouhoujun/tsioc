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
export declare class TimerActivity extends Activity {
    private timerId;
    private intervalId;
    private isRunning;
    /**
     * 定时器类型：'timeout' | 'interval' | 'date'
     */
    type: 'timeout' | 'interval' | 'date';
    /**
     * 延迟时间（毫秒，用于 timeout 和 interval）
     */
    delay?: number;
    /**
     * 目标日期（用于 date 类型）
     */
    targetDate?: Date;
    /**
     * 重复间隔（毫秒，用于 interval）
     */
    interval?: number;
    /**
     * 最大重复次数（用于 interval）
     */
    maxRepeats?: number;
    /**
     * 是否立即执行第一次（用于 interval）
     */
    immediate?: boolean;
    body: Activity;
    execute(context: ActivityContext): Promise<ActivityResult>;
    private executeTimeout;
    private executeInterval;
    private executeDate;
    compensate(context: ActivityContext): Promise<void>;
    private cleanup;
}
