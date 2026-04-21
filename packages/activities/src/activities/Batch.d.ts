import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface BatchActivityContext extends ActivityContext {
    batchResults?: any[];
}
export declare class BatchActivity extends Activity {
    items: any[];
    body: Activity;
    batchSize: number;
    continueOnError: boolean;
    delayBetweenBatches: number;
    execute(context: BatchActivityContext): Promise<ActivityResult>;
    private createBatches;
}
export declare class MergeActivity extends Activity {
    sources: any[];
    strategy: 'object' | 'array' | 'concat';
    deep: boolean;
    execute(context: ActivityContext): Promise<ActivityResult>;
    private mergeObjects;
    private deepMerge;
    private mergeArrays;
    private concatAll;
}
export declare class SplitActivity extends Activity {
    input: string | any[];
    delimiter: string;
    chunkSize?: number;
    execute(context: ActivityContext): Promise<ActivityResult>;
}
