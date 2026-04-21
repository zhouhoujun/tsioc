import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface TryCatchActivityContext extends ActivityContext {
    /**
     * try 块中的活动
     */
    tryActivity: Activity;
    /**
     * catch 块中的活动
     */
    catchActivity?: Activity | null;
    /**
     * finally 块中的活动
     */
    finallyActivity?: Activity | null;
    /**
     * 错误类型过滤器
     */
    errorTypes?: (new (...args: any[]) => Error)[];
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error) => Promise<ActivityResult>;
    /**
     * 是否在 catch 块中重新抛出错误
     */
    rethrow?: boolean;
}
export interface TryCatchActivityOptions {
    /**
     * finally 块中的活动
     */
    finallyActivity?: Activity | null;
    /**
     * 默认错误类型过滤器
     */
    defaultErrorTypes?: (new (...args: any[]) => Error)[];
    /**
     * 默认是否重新抛出错误
     */
    defaultRethrow?: boolean;
}
export declare class TryCatchActivity extends Activity {
    /**
     * try 块中的活动
     */
    tryActivity: Activity;
    /**
     * catch 块中的活动
     */
    catchActivity?: Activity | null;
    /**
     * finally 块中的活动
     */
    finallyActivity?: Activity | null;
    /**
     * 错误类型过滤器
     */
    errorTypes?: (new (...args: any[]) => Error)[];
    execute(context: ActivityContext): Promise<ActivityResult>;
    compensate(context: TryCatchActivityContext): Promise<void>;
}
