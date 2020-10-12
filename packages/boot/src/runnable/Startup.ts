import { lang, Type, Abstract, Inject, IDestoryable, Destoryable } from '@tsdi/ioc';
import { BootContext } from '../Context';
import { BOOTCONTEXT } from '../tk';


/**
 * startup interface. define the type as a startup.
 *
 * @export
 * @interface IRunnable
 * @template T
 * @template TCtx default BootContext
 */
export interface IStartup<T = any> extends IDestoryable {

    /**
     * runable context.
     *
     * @type {TCtx}
     * @memberof IRunnable
     */
    getContext(): BootContext;

    /**
     * get boot instance.
     *
     * @type {T}
     * @memberof IBoot
     */
    getBoot(): T;

    getBootType(): Type<T>;

    /**
     * configure startup service.
     *
     * @param {IBootContext} [ctx]
     * @returns {(Promise<void>)}
     * @memberof IStartup
     */
    configureService(ctx: BootContext): Promise<void>;

    /**
     *  startup boot.
     */
    startup(): Promise<void>

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
export abstract class Startup<T = any> extends Destoryable implements IStartup<T> {

    @Inject(BOOTCONTEXT) protected context: BootContext;

    /**
     * runable context.
     *
     * @type {TCtx}
     * @memberof IRunnable
     */
    getContext(): BootContext {
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
    abstract configureService(ctx: BootContext): Promise<void>;

    /**
     *  startup boot.
     */
    abstract startup(): Promise<void>;

    /**
     * destorying. default do nothing.
     */
    protected destroying() {

    }

}

/**
 * target is Runnable or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Startup}
 */
export function isStartup(target: any): target is Startup {
    if (target instanceof Startup) {
        return true;
    }
    return false;
}
