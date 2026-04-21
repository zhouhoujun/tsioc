import { Activity, ActivityContext, ActivityResult } from './Activity';
export type CodeActivityHandler = (context: ActivityContext) => Promise<ActivityResult> | ActivityResult;
export declare class CodeActivity extends Activity {
    handler: CodeActivityHandler;
    code: string;
    timeout: number;
    execute(context: ActivityContext): Promise<ActivityResult>;
}
