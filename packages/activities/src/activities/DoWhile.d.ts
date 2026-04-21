import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface DoWhileActivityOptions {
    defaultMaxIterations?: number;
    defaultInterval?: number;
}
export interface DoWhileActivityContext extends ActivityContext {
    /**
     * 循环条件
     */
    condition: () => Promise<boolean> | boolean;
    /**
     * 循环体活动
     */
    bodyActivity: Activity;
    /**
     * 最大迭代次数
     */
    maxIterations?: number;
    /**
     * 迭代间隔（毫秒）
     */
    interval?: number;
    /**
     * 迭代回调
     */
    onIteration?: (iteration: number, result: ActivityResult) => void;
}
export interface DoWhileActivityOptions {
    /**
     * 默认最大迭代次数
     */
    defaultMaxIterations?: number;
    /**
     * 默认迭代间隔
     */
    defaultInterval?: number;
}
export declare class DoWhileActivity implements Activity {
    private options;
    name: string;
    private isRunning;
    constructor(options?: DoWhileActivityOptions);
    execute(context: DoWhileActivityContext): Promise<ActivityResult>;
    compensate(context: DoWhileActivityContext): Promise<void>;
}
