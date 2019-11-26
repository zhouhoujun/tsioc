import { Injectable, Type, Refs, ContainerFactory, InjectToken, lang, isString, createRaiseContext, isToken, isNullOrUndefined, isBaseObject } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootContext, IModuleReflect } from '@tsdi/boot';
import { ActivityExecutor } from './ActivityExecutor';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityConfigure, Expression } from './ActivityConfigure';
import { ActivityStatus } from './ActivityStatus';

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
export class ActivityContext extends BootContext<ActivityOption, ActivityConfigure> {
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

    /**
     * workflow instane run status.
     */
    get status(): ActivityStatus {
        return this.runnable.status;
    }

    /**
     * current result.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    result?: any;

    // private _body: any;
    /**
     * context share body data.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    get body(): any {
        return this.get(CTX_EACH_BODY);
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
        let body = this.get(CTX_EACH_BODY);
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
        this.set(CTX_EACH_BODY, body);
    }

    getCurrBaseURL() {
        let baseURL = '';
        let mgr = this.reflects;
        this.status.scopes.some(s => {
            if (s.scope.$scopes && s.scope.$scopes.length) {
                return s.scope.$scopes.some(c => {
                    let refl = mgr.get<IModuleReflect>(lang.getClass(c));
                    if (refl && refl.baseURL) {
                        baseURL = refl.baseURL;
                    }
                    return !!baseURL
                })
            }
            return false;
        });

        return baseURL || this.baseURL;
    }

    static parse(target: Type | ActivityOption, raiseContainer?: ContainerFactory<IContainer>): ActivityContext {
        return createRaiseContext(ActivityContext, isToken(target) ? { module: target } : target, raiseContainer);
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
