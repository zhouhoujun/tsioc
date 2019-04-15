import {
    Injectable, isNullOrUndefined, isFunction, ObjectMap, isClass, Type, Refs
} from '@tsdi/ioc';
import { ITranslator } from './Translator';
import { BootContext, createAnnoationContext } from '@tsdi/boot';
import { IContainer } from '@tsdi/core';
import { CtxType, ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';


/**
 * base activity execute context.
 *
 * @export
 * @class ActivityContext
 * @implements {IActivityContext<any>}
 */
@Injectable
@Refs(Activity)
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
     * bootstrap runnable service.
     *
     * @type {Runnable<any>}
     * @memberof BootContext
     */
    runnable?: WorkflowInstance<any>;

    /**
     * assign value.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    assign: any;

    /**
     * condition.
     *
     * @type {boolean}
     * @memberof ActivityContext
     */
    condition: boolean;

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

    to<T>(target: CtxType<T>): T {
        if (isFunction(target)) {
            if (isClass(target)) {
                return target as any;
            }
            return target(this);
        } else {
            return target;
        }
    }

    static parse(target: Type<any> | ActivityOption<ActivityContext>, raiseContainer?: IContainer | (() => IContainer)): ActivityContext {
        return createAnnoationContext(ActivityContext, target, raiseContainer);
    }
}
