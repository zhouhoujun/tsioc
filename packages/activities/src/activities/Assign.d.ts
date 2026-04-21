import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface AssignActivityContext extends ActivityContext {
    variables?: Record<string, any>;
}
export declare class AssignActivity extends Activity {
    values: Record<string, any>;
    merge: boolean;
    overwrite: boolean;
    execute(context: AssignActivityContext): Promise<ActivityResult>;
}
