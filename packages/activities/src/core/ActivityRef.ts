import { PromiseUtil, lang } from '@tsdi/ioc';
import { ComponentRef, ElementRef, TemplateRef, NodeType } from '@tsdi/components';
import { ActivityContext } from './ActivityContext';
import { IActivityRef, ActivityResult, ACTIVITY_INPUT, ACTIVITY_OUTPUT } from './IActivityRef';
import { Activity } from './Activity';
import { TemplateOption } from './ActivityMetadata';
import { WorkflowContext } from './WorkflowInstance';


export class ActivityElementRef<T extends Activity = Activity> extends ElementRef<T, ActivityContext> implements IActivityRef {
    get name(): string {
        return this.nativeElement.name ?? lang.getClassName(this.nativeElement);
    }
    get runScope(): boolean {
        return this.nativeElement.runScope;
    }

    get input() {
        return this.context.get(ACTIVITY_INPUT);
    }

    get output() {
        return this.context.get(ACTIVITY_OUTPUT);
    }

    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void> {
        ctx.status.current = this;
        let result = await this.nativeElement.execute(this.context);
        this.context.set(ActivityResult, result);
        if (next) {
            await next();
        }
    }

    private _actionFunc: PromiseUtil.ActionHandle;
    toAction(): PromiseUtil.ActionHandle<WorkflowContext> {
        if (!this._actionFunc) {
            this._actionFunc = (ctx: WorkflowContext, next?: () => Promise<void>) => this.run(ctx, next);
        }
        return this._actionFunc;
    }
}


export class ActivityTemplateRef<T extends IActivityRef = IActivityRef> extends TemplateRef<T, ActivityContext> implements IActivityRef {

    get name(): string {
        return this.context.getOptions()?.name;
    }
    get runScope(): boolean {
        return true;
    }

    get input() {
        return this.context.get(ACTIVITY_INPUT);
    }

    get output() {
        return this.context.get(ACTIVITY_OUTPUT);
    }

    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void> {
        ctx.status.current = this;
        let result = await this.toAction()(ctx);
        this.context.set(ActivityResult, result);
        if (next) {
            await next();
        }
    }

    private _actionFunc: PromiseUtil.ActionHandle;
    toAction(): PromiseUtil.ActionHandle<WorkflowContext> {
        if (!this._actionFunc) {
            this._actionFunc = async (ctx: WorkflowContext, next?: () => Promise<void>) => {
                return await PromiseUtil.runInChain(this.rootNodes.map(r => r.toAction()), ctx, next);
            };
        }
        return this._actionFunc;
    }
}


/**
 *  activity ref for runtime.
 */
export class ActivityComponentRef<T = any> extends ComponentRef<T, IActivityRef, ActivityContext> implements IActivityRef<T> {
    readonly runScope = true;

    get name(): string {
        return this.context.getOptions()?.name || lang.getClassName(this.componentType);
    }

    get pipe(): string {
        return (<TemplateOption>this.context.getOptions()).pipe;
    }

    get input() {
        return this.context.get(ACTIVITY_INPUT);
    }

    get output() {
        return this.context.get(ACTIVITY_OUTPUT);
    }
    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void> {
        ctx.status.current = this;
        // await this.initResult(ctx);
        await (this.nodeRef as ActivityTemplateRef).run(ctx);
        // await this.context.getExector().runActivity(this.nodeRef., next);
        // await this.setResult(ctx);
        if (next) {
            await next();
        }
    }

    // protected async initResult(ctx: ActivityContext): Promise<any> {
    //     let ret = runspc ? runspc.get(ActivityResult) : ctx.data;
    //     if (!isNullOrUndefined(ret)) {
    //         if (this.pipe) {
    //             this._result = ctx.injector.get(ComponentBuilderToken)
    //                 .getPipe(this.pipe, this.context.injector)
    //                 ?.transform(ret);
    //         } else {
    //             this._result = ret;
    //         }
    //     }
    //     if (this.runScope) {
    //         ctx.status.currentScope.context.set(ActivityResult, this.result);
    //     }
    // }

    // protected async setResult(ctx: ActivityContext) {
    //     if (this.runScope) {
    //         ctx.status.scopeEnd();
    //     }
    //     if (!isNullOrUndefined(this.result)) {
    //         ctx.status.currentScope.set(ActivityResult, this.result);
    //         if (this.pipe) {
    //             ctx.injector.get(ComponentBuilderToken)
    //                 .getPipe(this.pipe, this.context.injector)
    //                 ?.reverse(ctx, this.result);
    //         }
    //     }
    // }

    private _actionFunc: PromiseUtil.ActionHandle;
    toAction(): PromiseUtil.ActionHandle<WorkflowContext> {
        if (!this._actionFunc) {
            this._actionFunc = (ctx: WorkflowContext, next?: () => Promise<void>) => this.run(ctx, next);
        }
        return this._actionFunc;
    }
}



/**
 * is acitivty instance or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Activity}
 */
export function isAcitvity(target: any): target is IActivityRef {
    return target instanceof ActivityElementRef || target instanceof ActivityTemplateRef || target instanceof ActivityComponentRef;
}

