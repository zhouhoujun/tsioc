import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { BootContext, createAnnoationContext, BuilderService } from '@tsdi/boot';
import { ActivityConfigure, ActivityTemplate, Expression } from './ActivityConfigure';
import { Injectable, ObjectMap, Type, Refs, ContainerFactory, isString, isClass, isFunction, isPromise } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';


/**
 * base activity execute context.
 *
 * @export
 * @class ActivityContext
 * @implements {IActivityContext<any>}
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
            this.runnable.status.scopes.some(s => {
                if (s.scope.scopes && s.scope.scopes.length) {
                    return s.scope.scopes.some(c => {
                        let ann = c.$annoation ? c.$annoation() : null;
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



    static parse(target: Type<any> | ActivityOption<ActivityContext>, raiseContainer?: ContainerFactory): ActivityContext {
        return createAnnoationContext(ActivityContext, target, raiseContainer);
    }

    async resolveExpression<TVal>(express: Expression<TVal>, container?: IContainer): Promise<TVal> {
        if (isClass(express)) {
            let bctx = await (container || this.getRaiseContainer()).get(BuilderService).run(express);
            return bctx.data;
        } else if (isFunction(express)) {
            return await express(this);
        } else if (express instanceof Activity) {
            await express.run(this);
            return express.result.value;
        } else if (isPromise(express)) {
            return await express;
        }
        return express;
    }
}
