import { lang, Type, Abstract, IDestoryable, Destoryable } from '@tsdi/ioc';
import { IBootContext } from '../Context';


/**
 * IRunnable interface. define the type as a runnable.
 *
 * @export
 * @interface IRunnable
 * @template T
 * @template TCtx default IBootContext
 */
export interface IRunnable extends IDestoryable {

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
export abstract class Runnable extends Destoryable implements IRunnable {

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
    protected destroying() { }

}

@Abstract()
export abstract class Startup<T = any> extends Runnable {

    protected context: IBootContext;

    async configureService(ctx: IBootContext): Promise<void> {
        this.context = ctx;
        await this.startup();
    }

    abstract startup(): Promise<void>;

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

}

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
