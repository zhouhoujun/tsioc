import { Token, ToInstance, Providers } from '../types';
import { IContainer } from '../IContainer';
import { isFunction } from '../utils/index';

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

}

// /**
//  * custome exnteds target.
//  *
//  * @param {*} target
//  * @memberof Provider
//  */
// extendsTarget ? (target: any)
