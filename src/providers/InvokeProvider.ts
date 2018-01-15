import { Provider } from './Provider';
import { Token, ToInstance, Providers } from '../types';
import { IContainer } from '../IContainer';

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
