import { Injectable, IInjector, isArray, Type, isClass, isFunction, isPromise, ObjectMap, isNil, AsyncHandler, chain, isString } from '@tsdi/ioc';
import { BUILDER } from '@tsdi/boot';
import { ActivityType, Expression } from './ActivityMetadata';
import { IActivityRef, ACTIVITY_INPUT, ACTIVITY_DATA } from './IActivityRef';
import { ActivityExecutorToken, IActivityExecutor } from './IActivityExecutor';
import { ActivityOption } from './ActivityOption';
import { isAcitvityRef, ActivityElementRef, IActivityElementRef, ActivityRef } from './WorkflowContext';
import { ActivityContext } from './ActivityContext';
import { Activity } from './Activity';
import { IWorkflowContext } from './IWorkflowContext';
import { CTX_RUN_PARENT } from './IActivityContext';


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

    /**
     * run activity in sub workflow.
     *
     * @template T
     * @param {T} ctx
     * @param ActivityType} activity
     * @returns {Promise<void>}
     * @memberof IActivityExecutor
     */
    runWorkflow<T extends IWorkflowContext>(activity: ActivityType, data?: any): Promise<T> {
        let ctx = this.context.workflow;
        let injector = ctx.injector;
        if (isAcitvityRef(activity)) {
            let nctx = ctx.clone() as T;
            activity.context.setValue(ACTIVITY_INPUT, data);
            return activity.run(nctx).then(() => nctx);
        } else if (activity instanceof Activity) {
            let actx = this.context.clone();
            return activity.execute(actx)
                .then(v => {
                    let nctx = ctx.clone();
                    nctx.setValue(ACTIVITY_DATA, v);
                    return nctx as T;
                });
        } else if (isClass(activity)) {
            return injector.getInstance(BUILDER).run<T, ActivityOption>({ type: activity, data: data });
        } else if (isFunction(activity)) {
            let nctx = ctx.clone() as T;
            return activity(nctx).then(() => nctx);
        } else {
            let md: Type;
            if (!isString(activity) && isClass(activity.activity)) {
                md = activity.activity;
            }

            let option = {
                type: md,
                template: activity,
                injector: injector,
                parent: ctx,
                data: data
            };

            return injector.getInstance(BUILDER).run<T>(option);
        }
    }

    eval(expression: string, envOptions?: ObjectMap) {
        if (!expression) {
            return expression;
        }
        envOptions = envOptions || {};
        envOptions['ctx'] = this.context;
        return this.context.componentProvider.getAstResolver()
            .resolve(expression, this.context.injector, envOptions);
    }

    async resolveExpression<TVal>(express: Expression<TVal>, injector?: IInjector): Promise<TVal> {
        let ctx = this.context;
        injector = injector || this.context.injector;
        if (isClass(express)) {
            let aref = await ctx.injector.getInstance(ComponentBuilderToken).resolve(express);
            if (isAcitvityRef(aref)) {
                await aref.run(ctx.workflow);
                return aref.context.getData();
            } else {
                return aref;
            }
        } else if (isFunction(express)) {
            return await express(ctx);
        } else if (isAcitvityRef(express)) {
            await express.run(ctx.workflow);
            return express.context.getData();
        } else if (isPromise(express)) {
            return await express;
        }
        return express;
    }

    async runActivity(activities: ActivityType | ActivityType[], input?: any, next?: () => Promise<void>): Promise<any> {
        await this.execAction(this.parseAction(activities, input), next);
        return this.context.getData();
    }

    async execAction<T extends IWorkflowContext>(actions: AsyncHandler<T> | AsyncHandler<T>[], next?: () => Promise<void>): Promise<void> {
        if (!isArray(actions)) {
            return await actions(this.context.workflow as T, next);
        }
        if (actions.length < 1) {
            if (next) {
                return await next();
            }
            return;
        }
        await chain(actions.filter(f => f), this.context.workflow, next);
    }

    parseAction<T extends IWorkflowContext>(activity: ActivityType | ActivityType[], input?: any): AsyncHandler<T> | AsyncHandler<T>[] {
        if (isArray(activity)) {
            return activity.filter(a => a).map(act => async (ctx: T, next?: () => Promise<void>) => {
                let handle = await this.buildActivity<T>(act, input);
                await handle(ctx, next);
            });
        } else {
            return async (ctx: T, next?: () => Promise<void>) => {
                let handle = await this.buildActivity(activity, input);
                await handle(ctx, next);
            }
        }
    }

    protected async buildActivity<T extends IWorkflowContext>(activity: ActivityType, input: any): Promise<AsyncHandler<T>> {
        let ctx = this.context;
        if (isAcitvityRef(activity)) {
            activity.context.setValue(CTX_RUN_PARENT, ctx);
            !isNil(input) && activity.context.setValue(ACTIVITY_INPUT, input);
            return activity.toAction();
        } else if (activity instanceof Activity) {
            let ref = this.context.injector.getValue(ELEMENT_REFS).get(activity) as IActivityElementRef;
            if (ref instanceof ActivityRef) {
                ref.context.setValue(CTX_RUN_PARENT, ctx);
            } else {
                ref = new ActivityElementRef(this.context, activity);
            }
            !isNil(input) && ref.context.setValue(ACTIVITY_INPUT, input);
            return ref.toAction();
        } else if (isClass(activity)) {
            let aref = await ctx.injector.getInstance(ComponentBuilderToken).resolve(activity) as IActivityRef;
            aref.context.setValue(CTX_RUN_PARENT, ctx);
            !isNil(input) && aref.context.setValue(ACTIVITY_INPUT, input);
            return aref.toAction();
        } else if (isFunction(activity)) {
            return activity;
        } else if (activity) {
            let md: Type;
            if (!isString(activity) && isClass(activity.activity)) {
                md = activity.activity;
            }
            let option = {
                type: md,
                template: activity,
                parent: ctx
            };
            let aref = await ctx.injector.getInstance(ComponentBuilderToken).resolve(option) as IActivityRef;
            aref.context.setValue(CTX_RUN_PARENT, ctx);
            !isNil(input) && aref.context.setValue(ACTIVITY_INPUT, input);
            return aref.toAction();
        }
    }
}
