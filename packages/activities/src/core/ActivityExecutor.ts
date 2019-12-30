import {
    Injectable, isArray, PromiseUtil, Type, isClass, Inject, ContainerFactoryToken,
    ContainerFactory, isMetadataObject, lang, isFunction, isPromise, ObjectMap, isBaseObject
} from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BuilderService, BuilderServiceToken } from '@tsdi/boot';
import { ComponentBuilderToken, AstResolver, getSelectorToken, ComponentBuilder } from '@tsdi/components';
import { ActivityType, ControlTemplate, Expression } from './ActivityConfigure';
import { ActivityContext } from './ActivityContext';
import { Activity } from './Activity';
import { ActivityExecutorToken, IActivityExecutor } from './IActivityExecutor';
import { ActivityOption } from './ActivityOption';
import { ActivityRef } from './ActivityRef';


/**
 * activity executor.
 *
 * @export
 * @class ActivityExecutor
 * @implements {IActivityExecutor}
 */
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

    /**
     * run activity in sub workflow.
     *
     * @template T
     * @param {T} ctx
     * @param ActivityType} activity
     * @returns {Promise<void>}
     * @memberof IActivityExecutor
     */
    runWorkflow<T extends ActivityContext>(ctx: T, activity: ActivityType, data?: any): Promise<T> {
        let container = this.getContainer();
        if (activity instanceof Activity || activity instanceof ActivityRef) {
            let nctx = ctx.clone().setBody(data);
            return activity.run(nctx).then(() => nctx);
        } else if (isClass(activity)) {
            return container.get(BuilderServiceToken).run<T, ActivityOption>({ type: activity, contexts: ctx.cloneContext(), data: data });
        } else if (isFunction(activity)) {
            let nctx = ctx.clone().setBody(data)
            return activity(nctx).then(() => nctx);
        } else {
            let md: Type;
            if (isClass(activity.activity)) {
                md = activity.activity;
            } else {
                md = ctx.injector.getTokenProvider(getSelectorToken(activity.activity));
            }

            let option = {
                module: md,
                template: activity,
                contexts: ctx.cloneContext(),
                data: data
            };

            return container.get(BuilderServiceToken).run<T>(option);
        }
    }

    eval(ctx: ActivityContext, expression: string, envOptions?: ObjectMap) {
        if (!expression) {
            return expression;
        }
        envOptions = envOptions || {};
        envOptions['ctx'] = ctx;
        let container = this.getContainer();
        return container.getInstance(AstResolver)
            .resolve(expression, envOptions, container);
    }

    async resolveExpression<TVal>(ctx: ActivityContext, express: Expression<TVal>, container?: IContainer): Promise<TVal> {
        if (isClass(express)) {
            let options = ctx.getOptions();
            let bctx = await (container || this.getContainer()).getInstance(BuilderService).run({ type: express, scope: options.scope });
            return bctx.data;
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
        await this.execActions(ctx, this.parseActions(activities), next);
    }

    async execActions<T extends ActivityContext>(ctx: T, actions: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void> {
        if (actions.length < 1) {
            if (next) {
                return await next();
            }
            return;
        }
        return await PromiseUtil.runInChain<ActivityContext>(actions.filter(f => f), ctx, next);
    }

    parseActions<T extends ActivityContext>(activities: ActivityType | ActivityType[]): PromiseUtil.ActionHandle<T>[] {
        let acts = isArray(activities) ? activities : (activities ? [activities] : []);
        if (acts.length < 1) {
            return [];
        }
        return acts.map(ac => this.parseAction(ac));
    }

    parseAction<T extends ActivityContext>(activity: ActivityType): PromiseUtil.ActionHandle<T> {
        if (activity instanceof Activity || activity instanceof ActivityRef) {
            return activity.toAction();
        } else if (isClass(activity) || isBaseObject(activity)) {
            return async (ctx: T, next?: () => Promise<void>) => {
                let act = await this.buildActivity(activity as Type | ControlTemplate, ctx);
                if (act instanceof Activity || act instanceof ActivityRef) {
                    await act.run(ctx, next);
                } else {
                    await next();
                }
            }
        }
        if (isFunction(activity)) {
            return activity;
        }
        return null;
    }

    protected async buildActivity(activity: Type | ControlTemplate, ctx: ActivityContext): Promise<Activity | ActivityRef> {
        let container = this.getContainer();
        if (isClass(activity)) {
            return await container.get(ComponentBuilderToken).resolveNode<ActivityContext>(activity);
        } else {
            let md: Type;
            if (isClass(activity.activity)) {
                md = activity.activity;
            } else {
                md = ctx.injector.getTokenProvider(getSelectorToken(activity.activity))
            }

            let option = {
                module: md,
                template: activity,
                scope: ctx.scope
            };
            return await container.getInstance(ComponentBuilder).resolveNode<ActivityContext>(option) as (ActivityRef | Activity);
        }
    }
}
