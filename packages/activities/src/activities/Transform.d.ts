import { Activity, ActivityContext, ActivityResult } from './Activity';
export type TransformFunction = (input: any, context: ActivityContext) => any;
export interface TransformActivityContext extends ActivityContext {
    input?: any;
}
export declare class TransformActivity extends Activity {
    transform: TransformFunction | string;
    input?: any;
    outputKey?: string;
    chain: TransformFunction[];
    execute(context: TransformActivityContext): Promise<ActivityResult>;
}
export declare class MapActivity extends Activity {
    items: any[];
    mapper: (item: any, index: number) => any;
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class FilterActivity extends Activity {
    items: any[];
    predicate: (item: any, index: number) => boolean;
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class ReduceActivity extends Activity {
    items: any[];
    reducer: (accumulator: any, currentValue: any, index: number) => any;
    initialValue?: any;
    execute(context: ActivityContext): Promise<ActivityResult>;
}
