import { ActivityContext } from './ActivityContext';
import { PromiseUtil, InjectToken, IDestoryable } from '@tsdi/ioc';

export const ActivityResult = new InjectToken<any>('Activity_Result');

export const ACTIVITY_INPUT = new InjectToken<any>('ACTIVITY_INPUT');
export const ACTIVITY_OUTPUT = new InjectToken<any>('ACTIVITY_OUTPUT');

export interface IActivityRef<T = any, TContext extends ActivityContext = ActivityContext> extends IDestoryable {
    name?: string;
    readonly input: T;
    readonly output: T;
    readonly runScope: boolean;
    readonly context: TContext;
    run(ctx: TContext, next?: () => Promise<void>): Promise<void>;
    toAction(): PromiseUtil.ActionHandle<T>;
}
