import {
    Injectable, isNullOrUndefined, ObjectMap, Type, Refs, ContainerFactory
} from '@tsdi/ioc';
import { ITranslator } from './Translator';
import { BootContext, createAnnoationContext } from '@tsdi/boot';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityConfigure, ActivityTemplate } from './ActivityConfigure';
import { IPropertyBinding } from './registers';



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
     * input.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    private _input: any;

    /**
     * execute Resulte.
     *
     * @readonly
     * @memberof ActivityContext
     */
    get input(): any {
        return this._input;
    }

    set input(data: any) {
        if (this._input !== data) {
            this.data = this.translate(data);
        }
        this._input = data;
    }

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


    currPropertyBinding?: IPropertyBinding<any>;

    /**
     * bootstrap runnable service.
     *
     * @type {WorkflowInstance}
     * @memberof BootContext
     */
    runnable?: WorkflowInstance;

    getActivity<T>(): Activity<T> {
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

    protected translate(data: any): any {
        if (isNullOrUndefined(data)) {
            return null;
        }
        let translator = this.getTranslator(data);
        if (translator) {
            return translator.translate(data);
        }
        return data;
    }

    protected getTranslator(input: any): ITranslator {
        return null;
    }

    getEnvArgs(): ObjectMap<any> {
        return {};
    }

    static parse(target: Type<any> | ActivityOption<ActivityContext>, raiseContainer?: ContainerFactory): ActivityContext {
        return createAnnoationContext(ActivityContext, target, raiseContainer);
    }
}
