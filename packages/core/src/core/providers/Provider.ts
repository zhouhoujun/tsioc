import { Token, ToInstance, Providers, Express2 } from '../../types';
import { IContainer } from '../../IContainer';
import { isFunction, isObject, symbols, isUndefined } from '../../utils/index';
import { IContainerBuilder } from '../../IContainerBuilder';

/**
 *  provider, to dynamic resovle instance of params in run time.
 *
 * @export
 * @class Provider
 */
export class Provider {
    /**
     * service provider is value or value factory.
     *
     * @memberof Provider
     */
    protected value?: any
    /**
     * service is instance of type.
     *
     * @type {Token<any>}
     * @memberof Provider
     */
    type?: Token<any>;

    constructor(type?: Token<any>, value?: any) {
        this.type = type;
        this.value = value;
    }

    /**
     * resolve provider value.
     *
     * @template T
     * @param {IContainer} container
     * @param {Providers[]} providers
     * @returns {T}
     * @memberof Provider
     */
    resolve<T>(container: IContainer, ...providers: Providers[]): T {
        if (isUndefined(this.value)) {
            return container.has(this.type) ? container.resolve(this.type, ...providers) : null;
        } else {
            return this.value; // isFunction(this.value) ? this.value(container) : this.value;
        }
    }

    /**
     * create provider.
     *
     * @static
     * @param {Token<any>} type
     * @param {(any)} value
     * @returns Provider
     * @memberof Provider
     */
    static create(type: Token<any>, value: any): Provider {
        return new Provider(type, value);
    }

    /**
     * create extends provider.
     *
     * @static
     * @param {Token<any>} token
     * @param {(any)} value
     * @param {Express2<any, ExtendsProvider, void>} [extendsTarget]
     * @returns {ExtendsProvider}
     * @memberof Provider
     */
    static createExtends(token: Token<any>, value: any, extendsTarget?: Express2<any, ExtendsProvider, void>): ExtendsProvider {
        return new ExtendsProvider(token, value, extendsTarget);
    }

    /**
     * create custom provider.
     *
     * @static
     * @param {Token<any>} [type]
     * @param {ToInstance<any>} [toInstance]
     * @param {*} [value]
     * @returns {CustomProvider}
     * @memberof Provider
     */
    static createCustom(type?: Token<any>, toInstance?: ToInstance<any>, value?: any): CustomProvider {
        return new CustomProvider(type, toInstance, value);
    }

    /**
     * create invoked provider.
     *
     * @static
     * @param {Token<any>} token
     * @param {string} method
     * @param {(any)} [value]
     * @returns {InvokeProvider}
     * @memberof Provider
     */
    static createInvoke(token: Token<any>, method: string, value?: any): InvokeProvider {
        return new InvokeProvider(token, method, value);
    }

    /**
     * create param provider.
     *
     * @static
     * @param {Token<any>} token
     * @param {(any)} value
     * @param {number} [index]
     * @param {string} [method]
     * @returns {ParamProvider}
     * @memberof Provider
     */
    static createParam(token: Token<any>, value: any, index?: number, method?: string): ParamProvider {
        return new ParamProvider(token, value, index, method);
    }

    /**
     * create async param provider.
     *
     * @static
     * @param {(string | string[])} files
     * @param {Token<any>} token
     * @param {number} [index]
     * @param {string} [method]
     * @param {(any)} [value]
     * @returns {AsyncParamProvider}
     * @memberof Provider
     */
    static createAsyncParam(files: string | string[], token: Token<any>, index?: number, method?: string, value?: any): AsyncParamProvider {
        return new AsyncParamProvider(files, token, index, method, value)
    }

}

export class CustomProvider extends Provider {
    /**
     * service value is the result of type instance invoke the method return value.
     *
     * @type {string}
     * @memberof Provider
     */
    protected toInstance?: ToInstance<any>;

    constructor(type?: Token<any>, toInstance?: ToInstance<any>, value?: any) {
        super(type, value);
        this.toInstance = toInstance;
    }

    resolve<T>(container: IContainer, ...providers: Providers[]): T {
        if (this.toInstance) {
            return this.toInstance(container, ...providers);
        }
        return super.resolve(container, ...providers);
    }
}


/**
 * InvokeProvider
 *
 * @export
 * @class InvokeProvider
 * @extends {Provider}
 */
export class InvokeProvider extends Provider {
    /**
     * service value is the result of type instance invoke the method return value.
     *
     * @type {string}
     * @memberof Provider
     */
    protected method?: string;

    constructor(type?: Token<any>, method?: string, value?: any) {
        super(type, value);
        this.method = method;
    }

    resolve<T>(container: IContainer, ...providers: Providers[]): T {
        if (this.method) {
            return container.syncInvoke<T>(this.type, this.method, ...providers);
        }
        return super.resolve(container, ...providers);
    }
}


/**
 * param provider.
 *
 * @export
 * @interface ParamProvider
 */
export class ParamProvider extends InvokeProvider {
    /**
     * param index, param name.
     *
     * @type {number}
     * @memberof ParamProvider
     */
    index?: number;

    constructor(token?: Token<any>, value?: any, index?: number, method?: string) {
        super(token, method, value);
        this.index = index;
    }

    resolve<T>(container: IContainer, ...providers: Providers[]): T {
        return super.resolve(container, ...providers);
    }
}

/**
 * Provider enable exntends target with provider in dynamic.
 *
 * @export
 * @class ExtendsProvider
 * @extends {Provider}
 */
export class ExtendsProvider extends Provider {


    constructor(token: Token<any>, value?: any, private extendsTarget?: Express2<any, ExtendsProvider, void>) {
        super(token, value);
    }

    resolve<T>(container: IContainer, ...providers: Providers[]): T {
        return super.resolve(container, ...providers);
    }

    extends(target: any) {
        if (isObject(target) && isFunction(this.extendsTarget)) {
            this.extendsTarget(target, this);
        }
    }
}



/**
 * async param provider.
 * async load source file and execution as param value.
 *
 * @export
 * @interface AsyncParamProvider
 * @extends {ParamProvider}
 */
export class AsyncParamProvider extends ParamProvider {
    /**
     * match ref files.
     *
     * @type {(string | string[])}
     * @memberof AsyncParamProvider
     */
    protected files?: string | string[];

    constructor(files: string | string[], token: Token<any>, index?: number, method?: string, value?: any) {
        super(token, value, index, method);
        this.files = files;
    }

    resolve<T>(container: IContainer, ...providers: Providers[]): any {
        let buider = container.get<IContainerBuilder>(symbols.IContainerBuilder);
        return buider.loadModule(container, {
            files: this.files
        })
            .then(() => {
                return super.resolve(container, ...providers);
            });
    }

}
