import { Injectable, Type, Refs, InjectToken, lang, isString, createRaiseContext, isToken, isNullOrUndefined, isBaseObject, IInjector } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootContext, IModuleReflect, CTX_DATA } from '@tsdi/boot';
import { ActivityExecutor } from './ActivityExecutor';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityMetadata, Expression } from './ActivityMetadata';
import { ActivityStatus } from './ActivityStatus';
import { ActivityRef } from './ActivityRef';

/**
 * workflow context token.
 */
export const WorkflowContextToken = new InjectToken<ActivityContext>('WorkflowContext');

/**
 * each body token.
 */
export const CTX_EACH_BODY = new InjectToken<any>('CTX_EACH_BODY');



/**
 * base activity execute context.
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BootContext)
@Refs('@Task', BootContext)
export class ActivityContext extends BootContext<ActivityOption, ActivityMetadata> {
    /**
     * workflow id.
     *
     * @type {string}
     * @memberof ActivityContext
     */
    id: string;
    /**
    * action name.
    *
    * @type {string}
    * @memberof ActivityOption
    */
    name: string;
    /**
     * bootstrap runnable service.
     *
     * @type {WorkflowInstance}
     * @memberof BootContext
     */
    runnable: WorkflowInstance;

    result: any;
    /**
     * workflow instane run status.
     */
    get status(): ActivityStatus {
        return this.runnable.status;
    }

    private _body: any;
    /**
     * context share body data.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    get body(): any {
        if (!this._body) {
            this._body = this.get(CTX_EACH_BODY) || this.get(CTX_DATA);
        }
        return this._body;
    }
    /**
     * set context share body.
     *
     * @param {*} value the value set to body.
     * @memberof ActivityContext
     */
    setBody(value: any);
    /**
     * set context share body.
     *
     * @param {*} value  the value set to body.
     * @param {string} filed name of filed to set value to
     * @memberof ActivityContext
     */
    setBody(value: any, filed: string);
    /**
     * set context share body.
     *
     * @param {*} value the value set to body.
     * @param {boolean} merge merge to existe body or not.
     * @memberof ActivityContext
     */
    setBody(value: any, merge: boolean);
    setBody(value: any, way?: any) {
        let body = this.body;
        if (isNullOrUndefined(body)) {
            body = {};
        }
        if (isString(way)) {
            body[way] = value;
        } else if (way === true) {
            body = isBaseObject(value) ? Object.assign(body, value) : value;
        } else {
            body = value;
        }
        this._body = body;
        this.set(CTX_EACH_BODY, body);
        return this;
    }

    getCurrBaseURL() {
        let baseURL = '';
        this.status.scopes.some(s => {
            if (s.scope.isScope && s.scope instanceof ActivityRef) {
                baseURL = s.scope.context.targetReflect.baseURL;
                return !!baseURL;
            }
            return false;
        });

        return baseURL || this.baseURL;
    }

    static parse(injector: IInjector, target: Type | ActivityOption): ActivityContext {
        return createRaiseContext(injector, ActivityContext, isToken(target) ? { module: target } : target);
    }

    private _executor: ActivityExecutor;
    getExector(): ActivityExecutor {
        if (!this._executor) {
            this._executor = this.getContainer().resolve(ActivityExecutor);
        }
        return this._executor;
    }

    resolveExpression<TVal>(express: Expression<TVal>, container?: IContainer): Promise<TVal> {
        return this.getExector().resolveExpression(this, express, container);
    }

}
