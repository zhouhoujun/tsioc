import { Injectable, Type, Refs, createRaiseContext, isToken, Token, SymbolType, tokenId } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { BuildContext, IAnnoationContext } from '@tsdi/boot';
import { ComponentContext, ITemplateContext, IComponentContext } from '@tsdi/components';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { ActivityMetadata, Expression } from './ActivityMetadata';
import { WorkflowContext, WorkflowContextToken } from './WorkflowInstance';
import { ACTIVITY_OUTPUT, ACTIVITY_INPUT } from './IActivityRef';
import { ActivityExecutorToken, IActivityExecutor } from './IActivityExecutor';


export const CTX_RUN_PARENT = tokenId<IAnnoationContext>('CTX_RUN_PARENT');
export const CTX_RUN_SCOPE = tokenId<IAnnoationContext>('CTX_RUN_SCOPE');
/**
 * activity execute context.ß
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BuildContext)
export class ActivityContext extends ComponentContext<ActivityOption, ActivityMetadata> {

    get input() {
        return this.getContextValue(ACTIVITY_INPUT);
    }

    get output() {
        return this.getContextValue(ACTIVITY_OUTPUT);
    }

    get scope() {
        return this.runScope?.component;
    }

    get runScope(): IComponentContext {
        if (!this.hasValue(CTX_RUN_SCOPE)) {
            let runsp = this.getContextValue(CTX_RUN_SCOPE);
            runsp && this.setValue(CTX_RUN_SCOPE, runsp);
        }
        return this.getValue(CTX_RUN_SCOPE) as IComponentContext;
    }

    private _workflow: WorkflowContext;
    get workflow(): WorkflowContext {
        if (!this._workflow) {
            this._workflow = this.injector.getSingleton(WorkflowContextToken) as WorkflowContext;
        }
        return this._workflow;
    }

    get<T>(token: Token<T>): T {
        let key = this.context.getTokenKey(token);
        return this.context.getInstance(key) ?? this.workflow?.context.getInstance(key) ?? null;
    }

    getValue<T>(key: SymbolType<T>): T {
        return this.context.getSingleton(key) ?? this.workflow?.context.getSingleton(key) ?? null;
    }

    private _executor: IActivityExecutor;
    getExector(): IActivityExecutor {
        if (!this._executor) {
            this._executor = this.injector.getInstance(ActivityExecutorToken, { provide: ActivityContext, useValue: this });
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

export class ActivityTemplateContext extends ActivityContext implements ITemplateContext {

}
