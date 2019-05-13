import {
    Injectable, ObjectMap, Type, Refs, ContainerFactory, isString
} from '@tsdi/ioc';
import { BootContext, createAnnoationContext } from '@tsdi/boot';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityConfigure, ActivityTemplate } from './ActivityConfigure';



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

    getBootTarget<T>(): Activity<T> {
        if (this.target instanceof Activity) {
            return this.target;
        } else if (this.bootstrap instanceof Activity) {
            return this.bootstrap;
        } else {
            return null;
        }
    }

    /**
     * previous if elseif condition.
     *
     * @type {boolean}
     * @memberof ActivityContext
     */
    preCondition: boolean;

    getEnvArgs(): ObjectMap<any> {
        return {};
    }

    static parse(target: Type<any> | ActivityOption<ActivityContext>, raiseContainer?: ContainerFactory): ActivityContext {
        return createAnnoationContext(ActivityContext, target, raiseContainer);
    }
}
