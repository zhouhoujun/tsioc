import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface ParallelActivityOptions {
    activities?: Activity[];
    maxConcurrent?: number;
    waitAll?: boolean;
    errorStrategy?: 'continue' | 'stop' | 'throw';
}
export interface ParallelActivityContext extends ActivityContext {
    /**
     * 要并行执行的活动列表
     */
    activities: Activity[];
    /**
     * 最大并发数
     */
    maxConcurrent?: number;
    /**
     * 是否等待所有活动完成
     */
    waitAll?: boolean;
    /**
     * 活动执行回调
     */
    onActivityComplete?: (activity: Activity, result: ActivityResult) => void;
    /**
     * 错误处理策略
     */
    errorStrategy?: 'continue' | 'stop' | 'throw';
}
export interface ParallelActivityOptions {
    /**
     * 默认最大并发数
     */
    defaultMaxConcurrent?: number;
    /**
     * 默认错误处理策略
     */
    defaultErrorStrategy?: 'continue' | 'stop' | 'throw';
}
export declare class ParallelActivity extends Activity {
    /**
     * 要并行执行的活动列表
     */
    activities: Activity[];
    /**
    * 最大并发数
    */
    maxConcurrent: number;
    /**
     * 是否等待所有活动完成
     */
    waitAll: boolean;
    /**
     * 错误处理策略
     */
    errorStrategy: 'continue' | 'stop' | 'throw';
    execute(context: ParallelActivityContext): Promise<ActivityResult>;
    private executeActivity;
    compensate(context: ParallelActivityContext): Promise<void>;
}
