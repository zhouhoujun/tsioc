
import { Token, lang, Inject, InjectToken, Type } from '@ts-ioc/ioc';
import { ModuleConfigure, BootOptions } from '../modules';
import { IContainer, ContainerToken } from '@ts-ioc/core';

/**
 * runable options.
 *
 * @export
 * @interface RunnableOptions
 * @template T
 */
export interface RunnableOptions<T> {
    /**
     * module token
     *
     * @type {Token<any>}
     * @memberof RunnableOptions
     */
    mdToken?: Token<any>;
    /**
     * bootstrap type.
     *
     * @type {Type<T>}
     * @memberof RunnableOptions
     */
    type: Type<T>;
    /**
     * bootstrap instance.
     *
     * @type {T}
     * @memberof RunnableOptions
     */
    instance: T;
    /**
     * bootstrap configure.
     *
     * @type {ModuleConfigure}
     * @memberof RunnableOptions
     */
    config: ModuleConfigure;

    /**
     *  custom boot data of `BuildOptions`
     *
     * @type {*}
     * @memberof RunnableOptions
     */
    data?: any;
}

/**
 * runnable options token.
 */
export const RunnableOptionsToken = new InjectToken<RunnableOptions<any>>('boot_runnable_options');



/**
 * runable interface. define the type as runable.
 *
 * @export
 * @interface IBoot
 * @template T
 */
export interface IRunnable<T> {
    /**
     * container.
     *
     * @type {IContainer}
     * @memberof IBoot
     */
    container: IContainer;

    /**
     * runable options.
     *
     * @type {RunnableOptions<T>}
     * @memberof IRunnable
     */
    readonly options?: RunnableOptions<T>;

    /**
     * boot build options.
     *
     * @type {BootOptions<T>}
     * @memberof IRunnable
     */
    readonly bootOptions?: BootOptions<T>;
    /**
     * target instance.
     *
     * @type {T}
     * @memberof IBoot
     */
    getTarget(): T;

    /**
     * get target token.
     *
     * @returns {Token<T>}
     * @memberof IBoot
     */
    getTargetType(): Token<T>;

    /**
     * on boot init.
     *
     * @param {BootOptions<T>} options
     * @returns {Promise<void>}
     * @memberof IBoot
     */
    onInit(options: RunnableOptions<T>, bootOptions?: BootOptions<T>): Promise<void>;

}

/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
export class Runnable<T> implements IRunnable<T> {

    @Inject(ContainerToken)
    container: IContainer;

    private _options: RunnableOptions<T>;
    get options(): RunnableOptions<T> {
        return this._options;
    }

    private _bootOptions: BootOptions<T>;
    get bootOptions(): BootOptions<T> {
        return this._bootOptions;
    }

    constructor(options?: RunnableOptions<T>) {
        this._options = options;
    }

    async onInit(options: RunnableOptions<T>, bootOptions?: BootOptions<T>): Promise<void> {
        if (options) {
            this._options = options;
        }
        this._bootOptions = bootOptions;
    }

    getTarget(): T {
        return this.options.instance;
    }

    getModuleToken(): Token<any> {
        return this.options.mdToken;
    }

    getTargetType(): Type<T> {
        return this.options.type || lang.getClass(this.options.instance);
    }

}

/**
 * target is Runnable or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Runnable<any>}
 */
export function isRunnable(target: any): target is Runnable<any> {
    if (target instanceof Runnable) {
        return true;
    }
    return false;
}
