import { Activity, ActivityContext, ActivityResult } from './Activity';
import { ConditionalActivity } from './Conditional';
export interface IfActivityOptions {
    /**
     * 默认错误处理函数
     */
    defaultErrorHandler?: (error: Error) => Promise<ActivityResult>;
}
export declare class IfActivity extends ConditionalActivity implements Activity {
    thenActivity: Activity;
    elseActivity?: Activity;
    onError?: (error: Error) => Promise<ActivityResult>;
    execute(context: ActivityContext): Promise<ActivityResult>;
    compensate(context: ActivityContext): Promise<void>;
}
