import {
    Injectable, ObjectMap, Type, Refs, ContainerFactory
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
