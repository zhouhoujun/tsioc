import { PromiseUtil, lang, isDefined } from '@tsdi/ioc';
import { ComponentRef, ElementRef, TemplateRef } from '@tsdi/components';
import { ActivityContext } from './ActivityContext';
import { IActivityRef, ACTIVITY_INPUT, ACTIVITY_OUTPUT } from './IActivityRef';
import { Activity } from './Activity';
import { TemplateOption } from './ActivityMetadata';
import { WorkflowContext } from './WorkflowInstance';


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


export class ActivityTemplateRef<T extends IActivityRef = IActivityRef> extends TemplateRef<T, ActivityContext> implements IActivityRef {
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
        ctx.status.current = this;
        let result = await this.toAction()(ctx);
        this.context.set(ACTIVITY_OUTPUT, result);
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

    get name(): string {
        return this.context.getOptions()?.name || lang.getClassName(this.componentType);
    }

    get pipe(): string {
        return (<TemplateOption>this.context.getOptions()).pipe;
    }

    get input() {
        return this.context.get(ACTIVITY_INPUT);
    }

    set input(data: any) {
        this.context.set(ACTIVITY_INPUT, data);
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
    return target instanceof ActivityElementRef || target instanceof ActivityTemplateRef || target instanceof ActivityComponentRef;
}

