import { Injectable, Type, Refs, createRaiseContext, isToken, Token, isNullOrUndefined, SymbolType } from '@tsdi/ioc';
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
            this._workflow = this.injector.getSingleton(ApplicationContextToken) as WorkflowContext;
        }
        return this._workflow;
    }

    resolve<T>(token: Token<T>): T {
        let key = this.context.getTokenKey(token);
        let instance: T;
        let ctx: AnnoationContext = this;
        while (ctx && isNullOrUndefined(instance)) {
            instance = ctx.context.getInstance(key);
            ctx = ctx.getParent();
        }
        if (isNullOrUndefined(instance)) {
            instance = this.workflow.context.getInstance(key);
        }
        return instance;
    }

    get<T>(token: Token<T>): T {
        let key = this.context.getTokenKey(token);
        return this.context.getInstance(key) ?? this.workflow?.context.getInstance(key) ?? null;
    }

    getValue<T>(key: SymbolType<T>): T {
        return this.context.getSingleton(key) ?? this.workflow?.context.getSingleton(key) ?? null;
    }

    private _executor: ActivityExecutor;
    getExector(): ActivityExecutor {
        if (!this._executor) {
            this._executor = this.injector.getInstance(ActivityExecutor, { provide: ActivityContext, useValue: this });
        }
        return this._executor;
    }

    resolveExpression<TVal>(express: Expression<TVal>, injector?: ICoreInjector): Promise<TVal> {
        return this.getExector().resolveExpression(express, injector);
    }


    static parse(injector: ICoreInjector, target: Type | ActivityOption): ActivityContext {
        return createRaiseContext(injector, ActivityContext, isToken(target) ? { module: target } : target);
    }

}
