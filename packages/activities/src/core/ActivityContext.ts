import {
    Injectable, isNullOrUndefined, isFunction, ObjectMap, isClass, InjectToken, Token
} from '@tsdi/ioc';
import { ITranslator } from './Translator';
import { BootContext, BootOption } from '@tsdi/boot';
import { Activity } from './Activity';


export const WorkflowId = new InjectToken<string>('Workflow_ID');

export interface ActivityOption extends BootOption {
    /**
     * workflow id.
     *
     * @type {string}
     * @memberof ActivityOption
     */
    id: string;
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
    input: any;
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
    selector?: string;
}


/**
 * async result.
 */
export type AsyncResult<T> = (ctx?: ActivityContext, activity?: Activity<any>) => Promise<T>;

/**
 * activity result.
 */
export type ExecuteResult<T> = Promise<T> | AsyncResult<T>;


/**
 * expression.
 */
export type Expression<T> = T | ExecuteResult<T>;

/**
 * ActivityResult type
 */
export type ActivityResultType<T> = Token<Activity<any>> | Token<any>;

/**
 * expression type.
 */
export type ExpressionType<T> = Expression<T> | ActivityResultType<T>;

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
            this.data = this.translate(data);
        }
        this._input = data;
    }


    /**
     * execute data.
     *
     * @type {*}
     * @memberof IActivityContext
     */
    data: any;

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

    // /**
    //  * exec activity result.
    //  *
    //  * @template T
    //  * @param {Activity} target
    //  * @param {Expression<T>} result
    //  * @returns {Promise<T>}
    //  * @memberof IContext
    //  */
    // exec<T>(target: Activity<any>, expression: Expression<T>): Promise<T> {
    //     if (isFunction(expression)) {
    //         return Promise.resolve(expression(this, target));
    //     } else if (isPromise(expression)) {
    //         return expression;
    //     } else if (isAcitvity(expression)) {
    //         return expression.run(this).then(ctx => ctx.result);
    //     } else if (isWorkflowInstance(expression)) {
    //         return expression.start(this).then(ctx => ctx.result);
    //     } else {
    //         return Promise.resolve(expression as T);
    //     }
    // }
}
