import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { BootContext, createAnnoationContext } from '@tsdi/boot';
import { ActivityConfigure, ActivityTemplate, Expression } from './ActivityConfigure';
import { Injectable, Type, Refs, ContainerFactory, isString } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { ActivityExecutor } from './ActivityExecutor';
import { ComponentManager } from '@tsdi/components';


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
     * input body data.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    body: any = {};

    /**
     * activty execute result data.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    result: any;
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
     * set body.
     *
     * @param {*} value the value set to body.
     * @param {(string | boolean)} [name] name of filed to set value to, or a flag. if true will replace the body with value.
     * @memberof ActivityContext
     */
    async setBody(value: any, name?: string | boolean) {
        if (isString(name)) {
            this.body[name] = value;
        } else {
            this.body = name ? value : Object.assign(this.body || {}, value);
        }
    }

    /**
     * previous if elseif condition.
     *
     * @type {boolean}
     * @memberof ActivityContext
     */
    preCondition: boolean;

    getCurrBaseURL() {
        let baseURL = '';
        if (this.runnable) {
            let mgr = this.getRaiseContainer().resolve(ComponentManager);
            this.runnable.status.scopes.some(s => {
                if (s.scope.$scopes && s.scope.$scopes.length) {
                    return s.scope.$scopes.some(c => {
                        let ann = mgr.getAnnoation(c);
                        if (ann) {
                            baseURL = ann.baseURL;
                        }
                        return !!baseURL
                    })
                }
                return false;
            });
        }
        return baseURL || this.baseURL;
    }



    static parse(target: Type | ActivityOption, raiseContainer?: ContainerFactory): ActivityContext {
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
