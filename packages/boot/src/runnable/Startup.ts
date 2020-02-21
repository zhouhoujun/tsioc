import { lang, Type, Abstract, Inject, InjectReference, Token } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { BootContext, IBootContext } from '../BootContext';


/**
 * startup interface. define the type as a startup.
 *
 * @export
 * @interface IRunnable
 * @template T
 * @template TCtx default BootContext
 */
export interface IStartup<T = any> {
    /**
     * get injector.
     *
     * @returns {IInjector}
     * @memberof IStartup
     */
    getInjector(): ICoreInjector;

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
     * @memberof IBoot
     */
    getBoot(): T;

    /**
     * get boot type.
     *
     * @returns {Type<T>}
     * @memberof IBoot
     */
    getBootType(): Type<T>;

    /**
     * startup runable service.
     *
     * @param {TCtx} [ctx]
     * @returns {(Promise<void | TCtx>)}
     * @memberof IRunnable
     */
    startup(ctx?: IBootContext): Promise<void | IBootContext>;

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
export abstract class Startup<T = any> implements IStartup<T> {

    protected context: IBootContext;
    constructor(@Inject(BootContext) ctx: IBootContext) {
        this.context = ctx as IBootContext;
    }

    /**
     * runable context.
     *
     * @type {TCtx}
     * @memberof IRunnable
     */
    getContext(): IBootContext {
        return this.context;
    }


    getInjector(): ICoreInjector {
        return this.context.injector;
    }


    getBoot(): T {
        return this.context.boot;
    }

    getBootType(): Type<T> {
        return lang.getClass(this.context.boot);
    }

    /**
     * startup runnable.
     *
     * @abstract
     * @returns {Promise<void|TCtx>>}
     * @memberof Runnable
     */
    abstract startup(): Promise<void>;

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


/**
 * module instance starup token.
 *
 * @export
 * @class InjectRunnerToken
 * @extends {Registration<Startup<T>>}
 * @template T
 */
export class InjectStartupToken<T> extends InjectReference<Startup<T>> {
    constructor(type: Token<T>) {
        super(Startup, type);
    }
}
