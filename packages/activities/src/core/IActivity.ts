import { ActivityContext } from './ActivityContext';
import { ActivityResult } from './ActivityResult';

export interface IActivity<T = any, TContext extends ActivityContext = ActivityContext> {
    name?: string;
    isScope?: boolean;
    readonly result: ActivityResult<T>;
    run(ctx: TContext, next?: () => Promise<void>): Promise<void>;
}
