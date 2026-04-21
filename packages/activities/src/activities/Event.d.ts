import { Activity, ActivityContext, ActivityResult } from './Activity';
export type EventHandler = (eventData: any, context: ActivityContext) => Promise<any> | any;
export interface EmitActivityContext extends ActivityContext {
    events?: Map<string, any[]>;
}
export declare class EmitActivity extends Activity {
    event: string;
    data?: any;
    bubble: boolean;
    execute(context: EmitActivityContext): Promise<ActivityResult>;
}
export declare class WaitActivity extends Activity {
    event: string;
    timeout?: number;
    handler?: EventHandler;
    private eventListeners;
    execute(context: EmitActivityContext): Promise<ActivityResult>;
    compensate(context: ActivityContext): Promise<void>;
}
export declare class OnActivity extends Activity {
    event: string;
    handler: EventHandler;
    once: boolean;
    execute(context: EmitActivityContext): Promise<ActivityResult>;
}
