import { PromiseUtil, lang, isNullOrUndefined, isDefined } from '@tsdi/ioc';
import { ComponentRef, ComponentBuilderToken, ElementRef } from '@tsdi/components';
import { ActivityContext } from './ActivityContext';
import { IActivity, ActivityResult } from './IActivity';
import { Activity } from './Activity';
import { TemplateOption } from './ActivityMetadata';

export class ActivityElementRef<T extends Activity = Activity> extends ElementRef<T> implements IActivity {
    get name(): string {
        return this.nativeElement.name ?? lang.getClassName(this.nativeElement);
    }
    get runScope(): boolean {
        return this.nativeElement.runScope;
    }

    async run(ctx: ActivityContext, next?: () => Promise<void>): Promise<void> {
        ctx.status.current = this;
        let result = await this.nativeElement.execute(ctx);
        this.context.set(ActivityResult, result);
        if (next) {
            await next();
        }
    }

    private _actionFunc: PromiseUtil.ActionHandle;
    toAction(): PromiseUtil.ActionHandle<T> {
        if (!this._actionFunc) {
            this._actionFunc = (ctx: ActivityContext, next?: () => Promise<void>) => this.run(ctx, next);
        }
        return this._actionFunc;
    }
}



/**
 *  activity ref for runtime.
 */
export class ActivityComponentRef<T = any, TN extends IActivity = IActivity> extends ComponentRef<T, TN> implements IActivity<T> {
    readonly runScope = true;

    get name(): string {
        return lang.getClassName(this.componentType);
    }

    private _result: T;
    get result(): T {
        return this._result;
    }

    get pipe(): string {
        return (<TemplateOption>this.context.getOptions()).pipe;
    }

    async run(ctx: ActivityContext, next?: () => Promise<void>): Promise<void> {
        ctx.status.current = this;
        await this.initResult(ctx);
        await ctx.getExector().runActivity(ctx, this.nodeRef.rootNodes, next);
        await this.setResult(ctx);
        if (next) {
            await next();
        }
    }

    protected async initResult(ctx: ActivityContext): Promise<any> {
        let runspc = ctx.status.scopes.find(s => isDefined(s.has(ActivityResult)));
        let ret = runspc ? runspc.get(ActivityResult) : ctx.data;
        if (!isNullOrUndefined(ret)) {
            if (this.pipe) {
                this._result = ctx.injector.get(ComponentBuilderToken)
                    .getPipe(this.pipe, this.context.injector)
                    ?.transform(ret);
            } else {
                this._result = ret;
            }
        }
        if (this.runScope) {
            ctx.status.currentScope.set(ActivityResult, this.result);
        }
    }

    protected async setResult(ctx: ActivityContext) {
        if (this.runScope) {
            ctx.status.scopeEnd();
        }
        if (!isNullOrUndefined(this.result)) {
            ctx.status.currentScope.set(ActivityResult, this.result);
            if (this.pipe) {
                ctx.injector.get(ComponentBuilderToken)
                    .getPipe(this.pipe, this.context.injector)
                    ?.reverse(ctx, this.result);
            }
        }
    }

    private _actionFunc: PromiseUtil.ActionHandle;
    toAction(): PromiseUtil.ActionHandle<T> {
        if (!this._actionFunc) {
            this._actionFunc = (ctx: ActivityContext, next?: () => Promise<void>) => this.run(ctx, next);
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
export function isAcitvity(target: any): target is IActivity {
    return target instanceof Activity || target instanceof ActivityComponentRef;
}

