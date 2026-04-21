import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface WhileActivityOptions {
    condition?: (context: ActivityContext) => Promise<boolean>;
    body?: Activity;
    maxIterations?: number;
    interval?: number;
}
export declare class WhileActivity extends Activity {
    private isRunning;
    /**
     * 循环条件函数
     */
    condition: (context: ActivityContext) => Promise<boolean>;
    /**
     * 循环体活动
     */
    body: Activity;
    /**
     * 最大迭代次数
     */
    maxIterations?: number;
    /**
     * 迭代间隔（毫秒）
     */
    interval?: number;
    execute(context: ActivityContext): Promise<ActivityResult>;
    private createResult;
    compensate(context: ActivityContext): Promise<void>;
}
