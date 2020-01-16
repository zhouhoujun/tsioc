import { Injectable, Type, Refs, createRaiseContext, isToken, IInjector, Token, isNullOrUndefined } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { BuildContext, AnnoationContext, ApplicationContextToken } from '@tsdi/boot';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { ActivityMetadata, Expression } from './ActivityMetadata';
import { ComponentContext } from '@tsdi/components';
import { WorkflowContext } from './WorkflowInstance';
import { ActivityExecutor } from './ActivityExecutor';
import { ACTIVITY_OUTPUT, ACTIVITY_INPUT } from './IActivityRef';


/**
 * activity execute context.ß
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BuildContext)
@Refs('@Task', BuildContext)
export class ActivityContext extends ComponentContext<ActivityOption, ActivityMetadata> {

    get input() {
        return this.resolve(ACTIVITY_INPUT);
    }

    get output() {
        return this.resolve(ACTIVITY_OUTPUT);
    }

    private _workflow: WorkflowContext;
    get workflow(): WorkflowContext {
        if (!this._workflow) {
            this._workflow = this.injector.get(ApplicationContextToken) as WorkflowContext;
        }
        return this._workflow;
    }

    resolve<T>(token: Token<T>): T {
        let key = this.contexts.getTokenKey(token);
        let instance: T;
        let ctx: AnnoationContext = this;
        while (ctx && isNullOrUndefined(instance)) {
            instance = ctx.contexts.getInstance(key);
            ctx = ctx.getParent();
        }
        if (isNullOrUndefined(instance)) {
            instance = this.workflow.contexts.getInstance(key);
        }
        return instance;
    }

    get<T>(token: Token<T>): T {
        let key = this.contexts.getTokenKey(token);
        return this.contexts.getInstance(key) ?? this.workflow?.contexts.getInstance(key) ?? null;
    }

    private _executor: ActivityExecutor;
    getExector(): ActivityExecutor {
        if (!this._executor) {
            this._executor = this.injector.get(ActivityExecutor, { provide: ActivityContext, useValue: this });
        }
        return this._executor;
    }

    resolveExpression<TVal>(express: Expression<TVal>, injector?: ICoreInjector): Promise<TVal> {
        return this.getExector().resolveExpression(express, injector);
    }


    static parse(injector: IInjector, target: Type | ActivityOption): ActivityContext {
        return createRaiseContext(injector, ActivityContext, isToken(target) ? { module: target } : target);
    }

}
