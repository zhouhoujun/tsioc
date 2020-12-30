import { Injectable, Type, Refs, isToken, Token, SymbolType, isDefined, IInjector } from '@tsdi/ioc';
import { BuildContext, createContext } from '@tsdi/boot';
import { ComponentContext, ITemplateContext } from '@tsdi/components';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { ActivityMetadata, Expression } from './ActivityMetadata';
import { ACTIVITY_DATA, ACTIVITY_INPUT, ACTIVITY_ORIGIN_DATA } from './IActivityRef';
import { ActivityExecutorToken, IActivityExecutor } from './IActivityExecutor';
import { IActivityContext, CTX_BASEURL, CTX_RUN_SCOPE, CTX_RUN_PARENT } from './IActivityContext';
import { IWorkflowContext, WorkflowContextToken } from './IWorkflowContext';



/**
 * activity execute context.
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BuildContext)
export class ActivityContext extends ComponentContext<ActivityOption> implements IActivityContext {

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
        let data = this.context.getValue(CTX_RUN_PARENT)?.getValue(ACTIVITY_DATA) ?? this.runScope?.getValue(ACTIVITY_DATA)
        isDefined(data) && this.setValue(ACTIVITY_DATA, data);
        return data;
    }

    /**
     * activity parent origin process data.
     */
    getOriginData<T = any>(): T {
        return this.context.getValue(ACTIVITY_ORIGIN_DATA)
            ?? this.context.getValue(CTX_RUN_PARENT)?.getValue(ACTIVITY_ORIGIN_DATA)
            ?? this.runScope?.getValue(ACTIVITY_ORIGIN_DATA)
            ?? this.getParent()?.getContextValue(ACTIVITY_ORIGIN_DATA);
    }

    /**
     * annoation metadata.
     */
    getAnnoation(): ActivityMetadata {
        return super.getAnnoation();
    }


    get baseURL() {
        return this.context.getValue(CTX_BASEURL) ?? this.getBaseURL();
    }
    protected getBaseURL() {
        let url = this.getParent()?.getContextValue(CTX_BASEURL) ?? this.workflow?.baseURL;
        url && this.setValue(CTX_BASEURL, url);
        return url;
    }

    get runScope(): IActivityContext {
        return this.context.getValue(CTX_RUN_SCOPE)
            ?? this.getParent()?.getContextValue(CTX_RUN_SCOPE, runsp => this.setValue(CTX_RUN_SCOPE, runsp));
    }

    get workflow(): IWorkflowContext {
        return this.injector.getValue(WorkflowContextToken)
    }

    get<T>(token: Token<T>): T {
        let key = this.context.getTokenKey(token);
        return this.getInstance(key);
    }

    getInstance<T>(key: SymbolType<T>): T {
        return this.context.getInstance(key) ?? this.workflow?.context.getInstance(key) ?? null;
    }

    getValue<T>(key: SymbolType<T>): T {
        return this.context.getValue(key) ?? this.workflow?.context.getValue(key) ?? null;
    }

    private _executor: IActivityExecutor;
    getExector(): IActivityExecutor {
        if (!this._executor) {
            this._executor = this.injector.getInstance(ActivityExecutorToken, { provide: ActivityContext, useValue: this });
        }
        return this._executor;
    }

    resolveExpression<TVal>(express: Expression<TVal>, injector?: IInjector): Promise<TVal> {
        return this.getExector().resolveExpression(express, injector);
    }


    static parse(injector: IInjector, target: Type | ActivityOption): ActivityContext {
        return createContext(injector, ActivityContext, isToken(target) ? { module: target } : target);
    }

}

export class ActivityTemplateContext extends ActivityContext implements ITemplateContext {
    selector?: Type<any>;
}
