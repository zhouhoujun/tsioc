import { PromiseUtil, lang, isDefined } from '@tsdi/ioc';
import { ComponentRef, TemplateRef, ElementRef } from '@tsdi/components';
import { ActivityContext } from './ActivityContext';
import { IActivityRef, ACTIVITY_OUTPUT } from './IActivityRef';
import { Activity } from './Activity';
import { WorkflowContext } from './WorkflowInstance';

export type ActivityNodeType = IActivityRef | Activity;

export class ActivityElementRef<T extends Activity = Activity> extends ElementRef<T, ActivityContext> implements IActivityRef {

    get name(): string {
        return this.nativeElement.name ?? lang.getClassName(this.nativeElement);
    }

    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void> {
        ctx.status.current = this;
        this.context.remove(ACTIVITY_OUTPUT);
        let result = await this.nativeElement.execute(this.context);
        if (isDefined(result)) {
            this.context.set(ACTIVITY_OUTPUT, result);
        }

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

export class ActivityTemplateRef<T extends ActivityNodeType = ActivityNodeType> extends TemplateRef<T, ActivityContext> implements IActivityRef {
    readonly isScope = true;
    get name(): string {
        return this.context.getOptions()?.name;
    }

    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void> {
        this.context.remove(ACTIVITY_OUTPUT);
        ctx.status.current = this;
        let result = await this.toAction()(ctx);
        if (isDefined(result)) {
            this.context.set(ACTIVITY_OUTPUT, result);
        }
        if (next) {
            await next();
        }
    }

    private _actionFunc: PromiseUtil.ActionHandle;
    toAction(): PromiseUtil.ActionHandle<WorkflowContext> {
        if (!this._actionFunc) {
            this._actionFunc = async (ctx: WorkflowContext, next?: () => Promise<void>) => {
                return await PromiseUtil.runInChain(this.rootNodes.map(r => isAcitvityRef(r) ? r.toAction() : r.toAction(this.context)), ctx, next);
            };
        }
        return this._actionFunc;
    }
}


/**
 *  activity ref for runtime.
 */
export class ActivityComponentRef<T = any> extends ComponentRef<T, ActivityNodeType, ActivityContext> implements IActivityRef<T> {

    get name(): string {
        return this.context.getOptions()?.name || lang.getClassName(this.componentType);
    }

    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void> {
        ctx.status.current = this;
        let nodeRef = this.nodeRef as ActivityTemplateRef;
        await nodeRef.run(ctx);
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



/**
 * is acitivty ref instance or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Activity}
 */
export function isAcitvityRef(target: any): target is IActivityRef {
    return target instanceof ActivityTemplateRef || target instanceof ActivityComponentRef;
}

