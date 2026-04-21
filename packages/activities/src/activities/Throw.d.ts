import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface ThrowActivityContext extends ActivityContext {
    /**
     * 要抛出的错误
     */
    error: Error | string;
    /**
     * 错误详情
     */
    details?: any;
    /**
     * 错误代码
     */
    code?: string | number;
    /**
     * 是否在抛出错误前执行补偿操作
     */
    compensateBeforeThrow?: boolean;
}
export interface ThrowActivityOptions {
    /**
     * 默认错误代码
     */
    defaultErrorCode?: string | number;
}
export declare class ThrowActivity extends Activity {
    options: ThrowActivityOptions;
    execute(context: ThrowActivityContext): Promise<ActivityResult>;
    compensate(context: ThrowActivityContext): Promise<void>;
}
