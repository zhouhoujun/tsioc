import { Abstract } from '@tsdi/ioc';
import { IStartup, Startup } from './Startup';

/**
 * IService interface
 *
 * @export
 * @interface IService
 */
export interface IService<T = any> extends IStartup<T> {
    /**
     * start application service.
     *
     * @returns {Promise<any>}
     * @memberof IService
     */
    start?(data?: any): Promise<any>;
    /**
     * stop server.
     *
     * @returns {Promise<any>}
     * @memberof IService
     */
    stop?(): Promise<any>;
}

/**
 * base service.
 *
 * @export
 * @abstract
 * @class Service
 * @implements {IService}
 */
@Abstract()
export abstract class Service<T = any> extends Startup<T> implements IService<T> {

    async startup() {
        await this.start(this.context.data);
    }

    /**
     * start service.
     *
     * @abstract
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof Service
     */
    abstract start?(data?: any): Promise<any>;
    /**
     * stop service.
     *
     * @abstract
     * @returns {Promise<any>}
     * @memberof Service
     */
    abstract stop(): Promise<any>;

    protected destroying() {
        this.stop();
    }
}

/**
 * target is Service or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Service}
 */
export function isService(target: any): target is Service {
    if (target instanceof Service) {
        return true;
    }
    return false;
}
