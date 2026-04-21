import { Activity, ActivityContext, ActivityResult } from './Activity';
export declare class StartActivity extends Activity {
    execute(context: ActivityContext): Promise<ActivityResult>;
}
