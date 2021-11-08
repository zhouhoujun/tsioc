import { Destory } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';


/**
 * configure services for application.
 */
export interface Service extends Destory {
    /**
     * config service of application.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {void} startup service token
     */
    configureService(ctx: ApplicationContext): void | Promise<void>;
}

/**
 * configure services for application.
 * 
 * @deprecated use `Service` instead.
 */
export interface IStartupService extends Service {

}
