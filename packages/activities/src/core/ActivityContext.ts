import { Injectable, Type, Refs, createRaiseContext, isToken, Token, SymbolType, tokenId, isDefined } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { BuildContext, IAnnoationContext } from '@tsdi/boot';
import { ComponentContext, ITemplateContext } from '@tsdi/components';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { ActivityMetadata, Expression } from './ActivityMetadata';
import { WorkflowContext, WorkflowContextToken } from './WorkflowInstance';
import { ACTIVITY_DATA, ACTIVITY_INPUT, ACTIVITY_ORIGIN_DATA } from './IActivityRef';
import { ActivityExecutorToken, IActivityExecutor } from './IActivityExecutor';


export const CTX_RUN_PARENT = tokenId<IAnnoationContext>('CTX_RUN_PARENT');
export const CTX_RUN_SCOPE = tokenId<ActivityContext>('CTX_RUN_SCOPE');
export const CTX_BASEURL = tokenId<string>('CTX_BASEURL');

/**
 * activity execute context.ß
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BuildContext)
export class ActivityContext extends ComponentContext<ActivityOption, ActivityMetadata> {

    /**
     * activity input data.
     */
    getInput<T = any>(): T {
        return this.context.getValue(ACTIVITY_INPUT)
            ?? this.getParent()?.getContextValue(ACTIVITY_INPUT, input => this.setValue(ACTIVITY_INPUT, input));
    }

    /**
     * activity process data.
     */
    getData<T = any>(): T {
        return this.context.getValue(ACTIVITY_DATA) ?? this.getProcessData();
    }

    protected getProcessData() {
        let data = this.runScope?.getData() ?? this.getParent()?.getContextValue(ACTIVITY_DATA);
        isDefined(data) &&  this.setValue(ACTIVITY_DATA, data);
        return data;
    }

    /**
     * activity parent origin process data.
     */
    getOriginData<T = any>(): T {
        return this.getContextValue(ACTIVITY_ORIGIN_DATA);
    }


    get baseURL() {
        return this.context.getValue(CTX_BASEURL) ?? this.getBaseURL();
    }
    protected getBaseURL() {
        let url = this.getParent()?.getContextValue(CTX_BASEURL) ?? this.workflow?.baseURL;
        url && this.setValue(CTX_BASEURL, url);
        return url;
    }

    get runScope(): ActivityContext {
        return this.context.getValue(CTX_RUN_SCOPE)
            ?? this.getParent()?.getContextValue(CTX_RUN_SCOPE, runsp => this.setValue(CTX_RUN_SCOPE, runsp));
    }

    get workflow(): WorkflowContext {
        return this.injector.getSingleton(WorkflowContextToken)
    }

    get<T>(token: Token<T>): T {
        let key = this.context.getTokenKey(token);
        return this.getInstance(key);
    }

    getInstance<T>(key: SymbolType<T>): T {
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
    selector?: Type<any>;
}
