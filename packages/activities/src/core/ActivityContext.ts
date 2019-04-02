import {
    Injectable, isNullOrUndefined, Inject, isFunction,
    isPromise, Type, hasOwnClassMetadata, ObjectMap, isClass
} from '@tsdi/ioc';
import { ITranslator } from './Translator';
import { BootContext } from '@tsdi/boot';
import { Expression, ActivityConfigure, isWorkflowInstance } from './ActivityConfigure';
import { Task } from '../decorators/Task';
import { isAcitvity, Activity } from './Activity';
import { ContainerToken, IContainer } from '@tsdi/core';
import { IActivityContext, CtxType } from './IActivityContext';




/**
 * base activity execute context.
 *
 * @export
 * @class ActivityContext
 * @implements {IActivityContext<any>}
 */
@Injectable
export class ActivityContext<T> extends BootContext implements IActivityContext {

    /**
     * build config.
     *
     * @type {*}
     * @memberof BuidActivityContext
     */
    config: any;

    /**
     * execute data.
     *
     * @type {T}
     * @memberof IActivityContext
     */
    data: T;

    /**
     * execute Resulte.
     *
     * @readonly
     * @memberof ActivityContext
     */
    get result(): T {
        return this.data;
    }

    set result(data: T) {
        this.data = data;
    }

    setAsResult(data: any) {
        this.result = this.translate(data);
    }

    setState(state: any, config: ActivityConfigure) {
        if (state instanceof ActivityContext) {
            this.target = state.target;
            this.setConfig(config, state);
            state = state.result;
        } else {
            this.setConfig(config);
        }
        this.setAsResult(state);
    }

    protected setConfig(config: ActivityConfigure, ctx?: ActivityContext<T>) {
        this.config = config || {};
    }

    // route(express: Express<ActivityContext<T>, boolean | void>): void {
    //     let stop = false;
    //     let node: ActivityContext<T> = this;
    //     while (!stop && node) {
    //         stop = !express(node);
    //         node = node === node.parent ? null : node.parent;
    //     }
    // }

    // find<T extends ActivityContext<any>>(express: T | Express<T, boolean>): T {
    //     let context: T;
    //     this.route(item => {
    //         if (context) {
    //             return false;
    //         }
    //         let isFinded = isFunction(express) ? express(item as T) : express === item;
    //         if (isFinded) {
    //             context = item as T;
    //             return false;
    //         }
    //         return true;
    //     });
    //     return context as T;
    // }

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

    // getRootPath(): string {
    //     let ctx = this.find(c => c.config && c.config.baseURL);
    //     if (ctx) {
    //         return ctx.config.baseURL;
    //     }
    //     return this.container.get(ProcessRunRootToken) || '.';
    // }


    getEnvArgs(): ObjectMap<any> {
        return {};
    }

    to<T>(target: CtxType<T>, config?: ActivityConfigure): T {
        if (isFunction(target)) {
            if (isClass(target)) {
                return target as any;
            }
            return target(this, config);
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
    // exec<T>(target: Activity, expression: Expression<T>): Promise<T> {
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

    // isTask(task: Type<Activity>): boolean {
    //     return hasOwnClassMetadata(Task, task);
    // }
}
