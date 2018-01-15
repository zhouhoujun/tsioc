import { Token, ToInstance, Providers, Express2 } from '../../types';
import { IContainer } from '../../IContainer';
import { isFunction, isObject } from '../../utils/index';
import { IContainerBuilder } from '../../IContainerBuilder';
import { symbols } from '../../utils/index';

// import { InvokeProvider } from './InvokeProvider';
// import { ParamProvider } from './ParamProvider';
// import { AsyncParamProvider } from './AsyncParamProvider';
// import { ExtendsProvider } from './ExtendsProvider';

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
    protected value?: any | ToInstance<any>
    /**
     * service is instance of type.
     *
     * @type {Token<any>}
     * @memberof Provider
     */
    type?: Token<any>;

    constructor(type?: Token<any>, value?: any | ToInstance<any>) {
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
        return isFunction(this.value) ? this.value(container) : this.value;
    }

    /**
     * create provider.
     *
     * @static
     * @param {Token<any>} type
     * @param {(any | ToInstance<any>)} value
     * @returns Provider
     * @memberof Provider
     */
    static create(type: Token<any>, value: any | ToInstance<any>): Provider {
        return new Provider(type, value);
    }

    static createExtends(type: Token<any>, value: any | ToInstance<any>, extendsTarget?: Express2<any, ExtendsProvider, void>): ExtendsProvider {
        return new ExtendsProvider(type, value, extendsTarget);
    }

    /**
     * create invoked provider.
     *
     * @static
     * @param {Token<any>} type
     * @param {string} method
     * @param {(any | ToInstance<any>)} [value]
     * @returns {InvokeProvider}
     * @memberof Provider
     */
    static createInvoke(type: Token<any>, method: string, value?: any | ToInstance<any>): InvokeProvider {
        return new InvokeProvider(type, method, value);
    }

    /**
     * create param provider.
     *
     * @static
     * @param {(number | string)} index
     * @param {(any | ToInstance<any>)} value
     * @param {Token<any>} [type]
     * @param {string} [method]
     * @returns {ParamProvider}
     * @memberof Provider
     */
    static createParam(index: number | string, value: any | ToInstance<any>, type?: Token<any>, method?: string): ParamProvider {
        return new ParamProvider(index, value, type, method);
    }

    /**
     * create async param provider.
     *
     * @static
     * @param {(string | string[])} files
     * @param {(number | string)} index
     * @param {Token<any>} type
     * @param {string} [method]
     * @param {(any | ToInstance<any>)} [value]
     * @returns {AsyncParamProvider}
     * @memberof Provider
     */
    static createAsyncParam(files: string | string[], index: number | string, type: Token<any>, method?: string, value?: any | ToInstance<any>): AsyncParamProvider {
        return new AsyncParamProvider(files, index, type, method, value)
    }

}

// /**
//  * custome exnteds target.
//  *
//  * @param {*} target
//  * @memberof Provider
//  */
// extendsTarget ? (target: any)


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

    constructor(type?: Token<any>, method?: string, value?: any | ToInstance<any>) {
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
    index?: number | string;

    constructor(index?: number | string, value?: any | ToInstance<any>, type?: Token<any>, method?: string) {
        super(type, method, value);
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


    constructor(type: Token<any>, value?: any | ToInstance<any>, private extendsTarget?: Express2<any, ExtendsProvider, void>) {
        super(type, value);
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

    constructor(files: string | string[], index: number | string, type: Token<any>, method?: string, value?: any | ToInstance<any>) {
        super(index, value, type, method);
        this.files = files;
    }

    resolve(container: IContainer, ...providers: Providers[]): any {
        let buider = container.get<IContainerBuilder>(symbols.IContainerBuilder);
        return buider.loadModule(container, {
            files: this.files
        })
            .then(() => {
                return super.resolve(container, ...providers);
            });
    }

}
