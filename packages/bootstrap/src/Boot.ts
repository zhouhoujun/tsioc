/**
 * boot interface.
 *
 * @export
 * @interface IBoot
 */
export interface IBoot {
    /**
     * boot run;
     *
     * @returns {Promise<any>}
     * @memberof IBoot
     */
    run(): Promise<any>;
}

/**
 * boot element.
 *
 * @export
 * @abstract
 * @class Boot
 * @implements {IBoot}
 */
export abstract class Boot implements IBoot {
    /**
     * boot run
     *
     * @abstract
     * @returns {Promise<any>}
     * @memberof Boot
     */
    abstract run(): Promise<any>;
}
