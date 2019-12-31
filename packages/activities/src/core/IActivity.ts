import { ActivityContext } from './ActivityContext';

export interface IActivity<TContext extends ActivityContext = ActivityContext> {
    run(ctx: TContext, next?: () => Promise<void>): Promise<void>;
}
