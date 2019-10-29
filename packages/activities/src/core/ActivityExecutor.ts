import {
    Injectable, isArray, PromiseUtil, Type, isClass, Inject, ContainerFactoryToken,
    ContainerFactory, isMetadataObject, lang, isFunction, isPromise
} from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BuilderService, BuilderServiceToken } from '@tsdi/boot';
import { ComponentBuilderToken, ComponentManager, SelectorManager, AstParserToken } from '@tsdi/components';
import { ActivityType, ControlTemplate, Expression } from './ActivityConfigure';
import { ActivityContext } from './ActivityContext';
import { Activity } from './Activity';
import { ActivityExecutorToken, IActivityExecutor } from './IActivityExecutor';
import { ActivityOption } from './ActivityOption';


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

    private componentMgr: ComponentManager;
    getComponentManager() {
        if (!this.componentMgr) {
            this.componentMgr = this.getContainer().get(ComponentManager);
        }
        return this.componentMgr;
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
    runWorkflow<T extends ActivityContext>(ctx: T, activity: ActivityType): Promise<T> {
        let container = this.getContainer();
        if (activity instanceof Activity) {
            return container.get(BuilderServiceToken).run<T, ActivityOption>({ module: lang.getClass(activity), target: activity, contexts: ctx.contexts });
        } else if (isClass(activity)) {
            return container.get(BuilderServiceToken).run<T, ActivityOption>({ module: activity, contexts: ctx.contexts });
        } else if (isFunction(activity)) {
            return activity(ctx).then(() => ctx);
        } else {
            let md: Type;
            let mgr = container.getInstance(SelectorManager);
            if (isClass(activity.activity)) {
                md = activity.activity;
            } else {
                md = mgr.get(activity.activity)
            }

            let option = {
                module: md,
                template: activity,
                contexts: ctx.contexts
            };

            return container.get(BuilderServiceToken).run<T>(option);
        }
    }

    eval(ctx: ActivityContext, expression: string) {
        if (!expression) {
            return expression;
        }
        let container = this.getContainer();
        if (container.has(AstParserToken)) {
            return container.get(AstParserToken).parse(expression).execute({ ctx: ctx });
        }

        try {
            // tslint:disable-next-line:no-eval
            return eval(expression);
        } catch {
            return expression;
        }
    }

    async resolveExpression<TVal>(ctx: ActivityContext, express: Expression<TVal>, container?: IContainer): Promise<TVal> {
        if (isClass(express)) {
            let bctx = await (container || this.getContainer()).getInstance(BuilderService).run({ module: express, scope: ctx.scope });
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
        if (activity instanceof Activity) {
            return activity.toAction();
        } else if (isClass(activity) || isMetadataObject(activity)) {
            return async (ctx: T, next?: () => Promise<void>) => {
                let act = await this.buildActivity(activity as Type | ControlTemplate, ctx.scope);
                if (act instanceof Activity) {
                    await act.run(ctx, next);
                } else if (act) {
                    let component = this.getComponentManager().getSelector(act).find(e => e instanceof Activity);
                    if (component instanceof Activity) {
                        await component.run(ctx, next);
                    } else {
                        console.log(act);
                        throw new Error(lang.getClassName(act) + ' is not activity');
                    }
                } else {
                    await next();
                }
            }
        }
        if (isFunction(activity)) {
            return activity;
        }
        if (activity) {
            let component = this.getComponentManager().getLeaf(activity);
            if (component instanceof Activity) {
                return component.toAction();
            }
        }
        return null;
    }

    protected async buildActivity(activity: Type | ControlTemplate, scope?: any): Promise<Activity> {
        let container = this.getContainer();
        if (isClass(activity)) {
            return await container.get(ComponentBuilderToken).resolveNode<ActivityContext>(activity, { scope: scope });
        } else {
            let md: Type;
            let mgr = container.getInstance(SelectorManager);
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
            let ctx = await container.getInstance(BuilderService).build<ActivityContext>(option);
            let boot = ctx.getBootTarget();
            if (boot) {
                return this.getComponentManager().getSelector(boot).find(e => e instanceof Activity);
            } else {
                console.log('activity config error');
                return boot;
            }
        }
    }
}
