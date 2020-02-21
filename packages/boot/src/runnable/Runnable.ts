import { Abstract, InjectReference, Token } from '@tsdi/ioc';
import { IStartup, Startup } from './Startup';


/**
 * runnable interface. define the type as runnable.
 *
 * @export
 * @interface IRunnable
 * @template T
 * @template TCtx default BootContext
 */
export interface IRunnable<T = any> extends IStartup<T> {

    /**
     * run application via boot instance.
     *
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof IRunner
     */
    run(data?: any): Promise<any>;

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
export abstract class Runnable<T = any> extends Startup<T> implements IRunnable<T> {

    async startup() {
        await this.run(this.context.data);
    }

    /**
     * run application via boot instance.
     *
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof IRunner
     */
    abstract run(data?: any): Promise<any>;

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


/**
 * module instance runner token.
 *
 * @export
 * @class InjectRunnerToken
 * @extends {Registration<Startup<T>>}
 * @template T
 */
export class InjectRunnableToken<T> extends InjectReference<Startup<T>> {
    constructor(type: Token<T>) {
        super(Startup, type);
    }
}

