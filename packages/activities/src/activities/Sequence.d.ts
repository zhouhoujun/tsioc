import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface SequenceActivityOptions {
    activities?: Activity[];
    continueOnError?: boolean;
    onError?: (error: Error) => Promise<ActivityResult>;
}
export declare class SequenceActivity extends Activity {
    /**
     * 要按顺序执行的活动列表
     */
    activities: Activity[];
    /**
     * 是否在错误时继续执行
     */
    continueOnError?: boolean;
    onError?: (error: Error) => Promise<ActivityResult>;
    execute(context: ActivityContext): Promise<ActivityResult>;
    compensate(context: ActivityContext): Promise<void>;
}
