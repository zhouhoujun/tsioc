import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface ForEachActivityContext extends ActivityContext {
    items?: any[];
    currentIndex?: number;
    currentItem?: any;
}
export declare class ForEachActivity extends Activity {
    items: any[];
    body: Activity;
    parallel: boolean;
    maxConcurrency: number;
    continueOnError: boolean;
    execute(context: ForEachActivityContext): Promise<ActivityResult>;
    private createBatches;
}
