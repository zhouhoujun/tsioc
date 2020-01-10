import { ActivityContext } from './ActivityContext';
import { PromiseUtil, InjectToken } from '@tsdi/ioc';

export const ActivityResult = new InjectToken<any>('Activity_Result');

export interface IActivity<T = any, TContext extends ActivityContext = ActivityContext> {
    name?: string;
    readonly runScope: boolean;
    run(ctx: TContext, next?: () => Promise<void>): Promise<void>;
    toAction(): PromiseUtil.ActionHandle<T>;
}
