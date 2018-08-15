
/**
 * IService interface
 *
 * @export
 * @interface IService
 */
export interface IService {
    /**
     * start boot.
     */
    start?(): Promise<any> | void;
    /**
     * stop boot.
     *
     * @returns {(Promise<any> | void)}
     * @memberof IBoot
     */
    stop?(): Promise<any> | void;
}

/**
 * base service.
 *
 * @export
 * @abstract
 * @class Service
 * @implements {IService}
 */
export abstract class Service implements IService {
    /**
     * start service.
     *
     * @abstract
     * @returns {Promise<any>}
     * @memberof Service
     */
    abstract start(): Promise<any>;
    /**
     * stop service.
     *
     * @abstract
     * @returns {Promise<any>}
     * @memberof Service
     */
    abstract stop(): Promise<any>;
}
