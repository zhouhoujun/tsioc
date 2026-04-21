import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface IntervalActivityOptions {
    interval?: number;
    body?: Activity;
    maxExecutions?: number;
    immediate?: boolean;
}
export declare class IntervalActivity extends Activity {
    private isRunning;
    private timeoutId;
    /**
     * 间隔时间（毫秒）
     */
    interval: number;
    /**
     * 要执行的活动
     */
    body: Activity;
    /**
     * 最大执行次数（可选，undefined表示无限执行）
     */
    maxExecutions: number | undefined;
    /**
     * 是否立即执行第一次
     */
    immediate: boolean;
    execute(context: ActivityContext): Promise<ActivityResult>;
    compensate(context: ActivityContext): Promise<void>;
    private cleanup;
}
