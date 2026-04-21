import { Activity, ActivityContext, ActivityResult } from './Activity';
export declare class ConditionalActivity extends Activity {
    condition: boolean;
    execute(context: ActivityContext): Promise<ActivityResult>;
}
