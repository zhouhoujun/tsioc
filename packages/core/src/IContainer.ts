import { IIocContainer } from '@tsdi/ioc';
import { ICoreInjector } from './ICoreInjector';



/**
 * root container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IIocContainer, ICoreInjector {
    /**
     * get root container.
     */
    getContainer(): this;
}
