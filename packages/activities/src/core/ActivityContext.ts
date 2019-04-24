import {
    Injectable, isNullOrUndefined, ObjectMap, Type, Refs
} from '@tsdi/ioc';
import { ITranslator } from './Translator';
import { BootContext, createAnnoationContext } from '@tsdi/boot';
import { IContainer } from '@tsdi/core';
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
     * @type {ActivityTemplate<T>}
     * @memberof ActivityConfigure
     */
    template?: ActivityTemplate<ActivityContext>;

    /**
     * activity annoation metadata.
     *
     * @type {ActivityConfigure<ActivityContext>}
     * @memberof ActivityContext
     */
    annoation: ActivityConfigure<ActivityContext>;

    /**
     * bootstrap runnable service.
     *
     * @type {WorkflowInstance<ActivityContext>}
     * @memberof BootContext
     */
    runnable?: WorkflowInstance<ActivityContext>;

    getActivity<T extends ActivityContext>(): Activity<T> {
        if (this.target instanceof Activity) {
            return this.target;
        } else if (this.bootstrap instanceof Activity) {
            return this.bootstrap;
        } else {
            console.log(this.target, this.bootstrap);
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

    static parse(target: Type<any> | ActivityOption<ActivityContext>, raiseContainer?: IContainer | (() => IContainer)): ActivityContext {
        return createAnnoationContext(ActivityContext, target, raiseContainer);
    }
}
