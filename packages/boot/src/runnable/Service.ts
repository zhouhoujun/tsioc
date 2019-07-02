import { IRunnable, Runnable, RunnableInit } from './Runnable';
import { Abstract } from '@tsdi/ioc';
import { BootContext } from '../BootContext';

/**
 * IService interface
 *
 * @export
 * @interface IService
 */
export interface IService<T, TCtx extends BootContext = BootContext> extends IRunnable<T, TCtx> {
    /**
     * start application service.
     *
     * @returns {Promise<any>}
     * @memberof IService
     */
    start(data?: any): Promise<any>;
    /**
     * stop server.
     *
     * @returns {Promise<any>}
     * @memberof IService
     */
    stop?(): Promise<any>;
}

/**
 * service on init hooks
 *
 * @export
 * @interface ServiceInit
 * @extends {RunnableInit}
 */
export interface ServiceInit extends RunnableInit {

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
export abstract class Service<T = any, TCtx extends BootContext = BootContext> extends Runnable<T, TCtx> implements IService<T, TCtx> {

    /**
     * run service.
     * call start service.
     *
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof Service
     */
    run(data?: any): Promise<any> {
        return this.start(data);
    }

    /**
     * start service.
     *
     * @abstract
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof Service
     */
    abstract start(data?: any): Promise<any>;
    /**
     * stop service.
     *
     * @abstract
     * @returns {Promise<any>}
     * @memberof Service
     */
    abstract stop(): Promise<any>;
}

