

/**
 * boot element.
 *
 * @export
 * @abstract
 * @class Boot
 */
export abstract class Boot {
    /**
     * boot run
     *
     * @abstract
     * @returns {Promise<any>}
     * @memberof Boot
     */
    abstract run(): Promise<any>;
}
