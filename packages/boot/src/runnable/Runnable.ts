import { lang, Type, Abstract, Inject, IDestoryable, Destoryable } from '@tsdi/ioc';
import { IBootContext } from '../Context';
import { BOOTCONTEXT } from '../tk';


/**
 * IRunnable interface. define the type as a runnable.
 *
 * @export
 * @interface IRunnable
 * @template T
 * @template TCtx default IBootContext
 */
export interface IRunnable<T = any> extends IDestoryable {

    /**
     * runable context.
     *
     * @type {TCtx}
     * @memberof IRunnable
     */
    getContext(): IBootContext;

    /**
     * get boot instance.
     *
     * @type {T}
     * @memberof IRunnable
     */
    getBoot(): T;

    /**
     * get boot type.
     */
    getBootType(): Type<T>;

    /**
     * configure and startup this service.
     *
     * @param {IBootContext} [ctx]
     * @returns {(Promise<void>)}
     * @memberof IRunnable
     */
    configureService(ctx: IBootContext): Promise<void>;

}


/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Runnable<T = any> extends Destoryable implements IRunnable<T> {

    @Inject(BOOTCONTEXT) protected context: IBootContext;

    /**
     * runable context.
     *
     * @type {TCtx}
     * @memberof IRunnable
     */
    getContext(): IBootContext {
        return this.context;
    }

    getBoot(): T {
        return this.context.boot;
    }

    getBootType(): Type<T> {
        return lang.getClass(this.context.boot);
    }

    /**
     * configure startup service.
     *
     * @param {IBootContext} [ctx]
     * @returns {(Promise<void>)}
     * @memberof IStartup
     */
    abstract configureService(ctx: IBootContext): Promise<void>;

    /**
     * destorying. default do nothing.
     */
    protected destroying() {

    }

}

@Abstract()
export abstract class Startup extends Runnable {}

/**
 * target is Runnable or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Runnable}
 */
export function isRunnable(target: any): target is Runnable {
    if (target instanceof Runnable) {
        return true;
    }
    return false;
}
