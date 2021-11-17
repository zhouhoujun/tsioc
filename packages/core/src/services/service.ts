import { Destroy } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';

/**
 * configure services for application.
 */
export interface Service extends Destroy {
    /**
     * config service of application.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {void} startup service token
     */
    configureService(ctx: ApplicationContext): void | Promise<void>;
}




// export class ServiceSet {

//     private servis: Set<ServiceRef>;
//     constructor() {

//     }

//     add() {

//     }

// }