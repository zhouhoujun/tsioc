import { Injectable, Type, Refs, ContainerFactory, InjectToken, lang, isString, isBoolean, isTypeObject } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootContext, createAnnoationContext, IModuleReflect } from '@tsdi/boot';
import { ActivityExecutor } from './ActivityExecutor';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityConfigure, ActivityTemplate, Expression } from './ActivityConfigure';

/**
 * workflow context token.
 */
export const WorkflowContextToken = new InjectToken<ActivityContext>('WorkflowContext');

/**
 * base activity execute context.
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BootContext)
@Refs('@Task', BootContext)
export class ActivityContext extends BootContext {
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
     * activities component template scope.
     *
     * @type {ActivityTemplate}
     * @memberof ActivityConfigure
     */
    template?: ActivityTemplate;
    /**
     * activity annoation metadata.
     *
     * @type {ActivityConfigure}
     * @memberof ActivityContext
     */
    annoation: ActivityConfigure;
    /**
     * bootstrap runnable service.
     *
     * @type {WorkflowInstance}
     * @memberof BootContext
     */
    runnable?: WorkflowInstance;
    /**
     * current result.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    result?: any;

    /**
     * previous if elseif condition.
     *
     * @type {boolean}
     * @memberof ActivityContext
     */
    preCondition: boolean;

    private _body: any;
    /**
     * context share body data.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    get body(): any {
        if (!this._body) {
            this._body = {};
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
        if (isString(way)) {
            this.body[way] = value;
        } else if (isBoolean(way)) {
            this._body = isTypeObject(value) ? Object.assign(this.body, value) : value;
        } else {
            this._body = value;
        }
        // this.setContext(EachBodyToken, this._body);
    }

    getCurrBaseURL() {
        let baseURL = '';
        if (this.runnable) {
            let mgr = this.reflects;
            this.runnable.status.scopes.some(s => {
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
        }
        return baseURL || this.baseURL;
    }

    static parse(target: Type | ActivityOption, raiseContainer?: ContainerFactory<IContainer>): ActivityContext {
        return createAnnoationContext(ActivityContext, target, raiseContainer);
    }

    private _executor: ActivityExecutor;
    getExector(): ActivityExecutor {
        if (!this._executor) {
            this._executor = this.getRaiseContainer().resolve(ActivityExecutor);
        }
        return this._executor;
    }

    resolveExpression<TVal>(express: Expression<TVal>, container?: IContainer): Promise<TVal> {
        return this.getExector().resolveExpression(this, express, container);
    }

}
