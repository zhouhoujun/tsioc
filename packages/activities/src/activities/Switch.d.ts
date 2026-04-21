import { Activity, ActivityContext, ActivityResult } from './Activity';
import { CaseActivity } from './Case';
export interface SwitchActivityOptions {
    cases?: CaseActivity<any>[];
    defaultActivity?: Activity;
    errorHandler?: (error: Error) => Promise<ActivityResult>;
    breakOnMatch?: boolean;
}
export declare class SwitchActivity<T> extends Activity {
    /**
     * case 活动列表
     */
    cases: CaseActivity<T>[];
    /**
     * 默认活动（当所有 case 都不匹配时执行）
     */
    defaultActivity?: Activity;
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error) => Promise<ActivityResult>;
    /**
     * 是否在第一个匹配的 case 后停止执行
     */
    breakOnMatch?: boolean;
    execute(context: ActivityContext): Promise<ActivityResult>;
    compensate(context: ActivityContext): Promise<void>;
}
