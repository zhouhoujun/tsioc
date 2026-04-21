import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface CaseActivityOptions {
    caseFlag?: any;
    body?: Activity;
    onError?: (context: ActivityContext) => Promise<ActivityResult>;
}
export declare class CaseActivity<T> extends Activity {
    caseFlag: T;
    body: Activity;
    onError?: (context: ActivityContext) => Promise<ActivityResult>;
    execute(context: ActivityContext): Promise<ActivityResult>;
    compensate(context: ActivityContext): Promise<void>;
}
