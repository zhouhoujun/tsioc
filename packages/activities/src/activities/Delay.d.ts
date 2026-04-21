import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface DelayActivityOptions {
    duration?: number;
    body?: Activity;
}
export declare class DelayActivity extends Activity {
    /**
     * 延迟时间（毫秒）
     */
    duration: number;
    body: Activity | undefined;
    private abortController;
    execute(context: ActivityContext): Promise<ActivityResult>;
    compensate(context: ActivityContext): Promise<void>;
}
