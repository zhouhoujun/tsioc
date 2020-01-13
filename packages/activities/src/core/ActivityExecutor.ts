import {
    Injectable, isArray, PromiseUtil, Type, isClass, isFunction, isPromise, ObjectMap,
    isBaseObject, ActionInjectorToken, DecoratorProvider
} from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { BuilderService, BuilderServiceToken } from '@tsdi/boot';
import { ComponentBuilderToken, AstResolver, ComponentBuilder, RefSelector } from '@tsdi/components';
import { ActivityType, ControlTemplate, Expression } from './ActivityMetadata';
import { ActivityContext } from './ActivityContext';
import { IActivityRef } from './IActivityRef';
import { ActivityExecutorToken, IActivityExecutor } from './IActivityExecutor';
import { ActivityOption } from './ActivityOption';
import { isAcitvity } from './ActivityRef';
import { Task } from '../decorators/Task';


/**
 * activity executor.
 *
 * @export
 * @class ActivityExecutor
 * @implements {IActivityExecutor}
 */
@Injectable(ActivityExecutorToken)
export class ActivityExecutor implements IActivityExecutor {

    constructor(private context: ActivityContext) {

    }

    private _refSelector: RefSelector;
    getRefSelector() {
        if (!this._refSelector) {
            this._refSelector = this.context.injector.get(ActionInjectorToken).get(DecoratorProvider).resolve(Task, RefSelector);
        }
        return this._refSelector;
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
    runWorkflow<T extends ActivityContext>(activity: ActivityType, data?: any): Promise<T> {
        let ctx = this.context;
        let injector = ctx.injector;
        if (isAcitvity(activity)) {
            let nctx = ctx.clone().setBody(data);
            return activity.run(nctx).then(() => nctx);
        } else if (isClass(activity)) {
            return injector.get(BuilderServiceToken).run<T, ActivityOption>({ type: activity, contexts: ctx.cloneContext(), data: data });
        } else if (isFunction(activity)) {
            let nctx = ctx.clone().setBody(data)
            return activity(nctx).then(() => nctx);
        } else {
            let md: Type;
            if (isClass(activity.activity)) {
                md = activity.activity;
            } else {
                md = injector.getTokenProvider(this.getRefSelector().toSelectorToken(activity.activity));
            }

            let option = {
                module: md,
                template: activity,
                contexts: ctx.cloneContext(),
                data: data
            };

            return injector.get(BuilderServiceToken).run<T>(option);
        }
    }

    eval(expression: string, envOptions?: ObjectMap) {
        if (!expression) {
            return expression;
        }
        envOptions = envOptions || {};
        envOptions['ctx'] = this.context;
        return this.context.injector.getInstance(AstResolver)
            .resolve(expression, envOptions, this.context.injector);
    }

    async resolveExpression<TVal>(express: Expression<TVal>, injector?: ICoreInjector): Promise<TVal> {
        let ctx = this.context;
        injector = injector || this.context.injector;
        if (isClass(express)) {
            let bctx = await injector.getInstance(BuilderService).run({ type: express, parent: ctx, injector: injector });
            return bctx.data;
        } else if (isFunction(express)) {
            return await express(ctx);
        } else if (isAcitvity(express)) {
            await express.run(ctx);
            return ctx.status.current.;
        } else if (isPromise(express)) {
            return await express;
        }
        return express;
    }

    async runActivity(activities: ActivityType | ActivityType[], next?: () => Promise<void>): Promise<void> {
        await this.execActions(this.parseActions(activities), next);
    }

    async execActions<T extends ActivityContext>(actions: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void> {
        if (actions.length < 1) {
            if (next) {
                return await next();
            }
            return;
        }
        return await PromiseUtil.runInChain(actions.filter(f => f), this.context, next);
    }

    parseActions<T extends ActivityContext>(activities: ActivityType | ActivityType[]): PromiseUtil.ActionHandle<T>[] {
        let acts = isArray(activities) ? activities : (activities ? [activities] : []);
        if (acts.length < 1) {
            return [];
        }
        return acts.map(ac => this.parseAction(ac));
    }

    parseAction<T extends ActivityContext>(activity: ActivityType): PromiseUtil.ActionHandle<T> {
        if (isAcitvity(activity)) {
            return activity.toAction();
        } else if (isClass(activity) || isBaseObject(activity)) {
            return async (ctx: T, next?: () => Promise<void>) => {
                let act = await this.buildActivity(activity as Type | ControlTemplate, ctx);
                if (isAcitvity(act)) {
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

    protected async buildActivity(activity: Type | ControlTemplate): Promise<IActivityRef> {
        let ctx = this.context;
        if (isClass(activity)) {
            return await ctx.injector.get(ComponentBuilderToken).resolveRef(activity);
        } else {
            let md: Type;
            if (isClass(activity.activity)) {
                md = activity.activity;
            } else {
                md = ctx.injector.getTokenProvider(this.getRefSelector().toSelectorToken(activity.activity))
            }

            let option = {
                module: md,
                template: activity,
                parent: ctx
            };
            return await ctx.injector.getInstance(ComponentBuilder).resolveRef(option);
        }
    }
}
