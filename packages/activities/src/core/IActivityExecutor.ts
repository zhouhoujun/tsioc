import { IContainer } from '@tsdi/core';
import { ActivityContext } from './ActivityContext';
import { Expression, ActivityType } from './ActivityConfigure';
import { PromiseUtil, InjectToken } from '@tsdi/ioc';

export interface IActivityExecutor {
    getContainer(): IContainer;
    resolveExpression<TVal>(ctx: ActivityContext, express: Expression<TVal>, container?: IContainer): Promise<TVal>;
    runActivity<T extends ActivityContext>(ctx: T, activities: ActivityType | ActivityType[], next?: () => Promise<void>): Promise<void>;
    execActions<T extends ActivityContext>(ctx: T, actions: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void>;
    parseAction<T extends ActivityContext>(activity: ActivityType): PromiseUtil.ActionHandle<T>;
}

export const ActivityExecutorToken = new InjectToken<IActivityExecutor>('ActivityExecutor');
