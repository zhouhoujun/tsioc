import { Invocation, AbstractType } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';
export type InvokeFn = (context: ActivityContext, ...args: any[]) => Promise<any>;
export interface InvokeActivityOptions {
    target?: AbstractType | Invocation;
    invoke?: string | InvokeFn;
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
}
export declare class InvokeActivity extends Activity {
    target: AbstractType | Invocation | undefined;
    invoke: string | InvokeFn;
    maxAttempts: number;
    delay: number;
    backoff: number;
    execute(context: ActivityContext): Promise<ActivityResult>;
    private invokeTarget;
}
