
/**
 * base service.
 *
 * @export
 * @abstract
 * @class Service
 */
export abstract class Service {
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
