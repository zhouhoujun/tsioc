import {
    Injectable, isArray, PromiseUtil, Type, isClass, Inject,
    ContainerFactoryToken, ContainerFactory, isMetadataObject, lang, isFunction, isPromise
} from '@tsdi/ioc';
import { ActivityType, ControlTemplate, Expression } from './ActivityConfigure';
import { ActivityContext } from './ActivityContext';
import { Activity } from './Activity';
import { IContainer } from '@tsdi/core';
import { BuilderService } from '@tsdi/boot';
import { ActivityExecutorToken, IActivityExecutor } from './IActivityExecutor';
import { ComponentManager, SelectorManager } from '@tsdi/components';

@Injectable(ActivityExecutorToken)
export class ActivityExecutor implements IActivityExecutor {

    constructor() {

    }
    /**
     * conatiner.
     *
     * @type {IContainer}
     * @memberof Activity
     */
    @Inject(ContainerFactoryToken)
    private containerFac: ContainerFactory;

    getContainer(): IContainer {
        return this.containerFac() as IContainer;
    }

    async resolveExpression<TVal>(ctx: ActivityContext, express: Expression<TVal>, container?: IContainer): Promise<TVal> {
        if (isClass(express)) {
            let bctx = await (container || this.getContainer()).get(BuilderService).run({ module: express, scope: ctx.scope });
            return bctx['result'] || bctx.data;
        } else if (isFunction(express)) {
            return await express(ctx);
        } else if (express instanceof Activity) {
            await express.run(ctx);
            return express.result.value;
        } else if (isPromise(express)) {
            return await express;
        }
        return express;
    }

    async runActivity<T extends ActivityContext>(ctx: T, activities: ActivityType | ActivityType[], next?: () => Promise<void>): Promise<void> {
        if (!activities || (isArray(activities) && activities.length < 1)) {
            return;
        }
        await this.execActions(ctx, (isArray(activities) ? activities : [activities]).map(ac => this.parseAction(ac)), next);
    }

    execActions<T extends ActivityContext>(ctx: T, actions: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain<ActivityContext>(actions.filter(f => f), ctx, next);
    }

    parseAction<T extends ActivityContext>(activity: ActivityType): PromiseUtil.ActionHandle<T> {
        if (activity instanceof Activity) {
            return activity.toAction();
        } else if (isClass(activity) || isMetadataObject(activity)) {
            return async (ctx: T, next?: () => Promise<void>) => {
                let act = await this.buildActivity(activity as Type<any> | ControlTemplate, ctx.scope);
                if (act instanceof Activity) {
                    await act.run(ctx, next);
                } else if (act) {
                    let component = this.getContainer().get(ComponentManager).getLeaf(act);
                    if (component instanceof Activity) {
                        await component.run(ctx, next);
                    } else {
                        console.log(act);
                        throw new Error(lang.getClassName(act) + ' is not activity');
                    }
                } else {
                    await next();
                }
            };

        }
        if (isFunction(activity)) {
            return activity;
        }
        if (activity) {
            let component = this.getContainer().get(ComponentManager).getLeaf(activity);
            if (component instanceof Activity) {
                return component.toAction();
            }
        }
        return null;

    }

    protected async buildActivity(activity: Type<any> | ControlTemplate, scope?: any): Promise<Activity<any>> {
        let ctx: ActivityContext;
        let container = this.getContainer();
        if (isClass(activity)) {
            ctx = await container.get(BuilderService).build<ActivityContext>({ module: activity, scope: scope });
        } else {
            let md: Type<any>;
            let mgr = container.get(SelectorManager);
            if (isClass(activity.activity)) {
                md = activity.activity;
            } else {
                md = mgr.get(activity.activity)
            }

            let option = {
                module: md,
                template: activity,
                scope: scope
            };
            ctx = await container.get(BuilderService).build<ActivityContext>(option);
        }
        return ctx.getBootTarget();
    }
}
