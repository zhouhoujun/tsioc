import {
    Injectable, isNullOrUndefined, isFunction, ObjectMap, isClass, InjectToken, Type
} from '@tsdi/ioc';
import { ITranslator } from './Translator';
import { BootContext, BootOption, createAnnoationContext } from '@tsdi/boot';
import { Activity } from './Activity';
import { IContainer } from '@tsdi/core';


export const WorkflowId = new InjectToken<string>('Workflow_ID');

export interface ActivityOption extends BootOption {
    /**
     * workflow id.
     *
     * @type {string}
     * @memberof ActivityOption
     */
    id?: string;
    /**
    * action name.
    *
    * @type {string}
    * @memberof ActivityOption
    */
    name?: string;
    /**
     * input data
     *
     * @type {*}
     * @memberof IRunContext
     */
    input?: any;
    /**
     * task title.
     *
     * @type {string}
     * @memberof IActivityConfigure
     */
    title?: string;

    /**
     * selector.
     *
     * @type {string}
     * @memberof ActivityConfigure
     */
    selector: string;
}


/**
 * expression.
 */
export type Expression<T> = T | Promise<T> | ((ctx: ActivityContext) => T | Promise<T>) | Type<any>;

/**
 * context type.
 */
export type CtxType<T> = T | ((context?: ActivityContext, activity?: Activity<any>) => T);



/**
 * base activity execute context.
 *
 * @export
 * @class ActivityContext
 * @implements {IActivityContext<any>}
 */
@Injectable
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
            this.result = this.translate(data);
        }
        this._input = data;
    }


    /**
     * execute data.
     *
     * @type {*}
     * @memberof IActivityContext
     */
    result: any;

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

    static parse(target: Type<any> | ActivityOption, raiseContainer?: IContainer | (() => IContainer)): ActivityContext {
        return createAnnoationContext(ActivityContext, target, raiseContainer);
    }
}
