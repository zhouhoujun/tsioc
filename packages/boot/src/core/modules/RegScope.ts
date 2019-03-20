/**
 * register module scope.
 *
 * @export
 * @enum {number}
 */
export enum RegScope {
    /**
     * register as child module.
     */
    child = 1,
    /**
     * regiser as root module
     */
    root,
    /**
     * current boot module
     */
    booModule,
    /**
     * register all container in pools.
     */
    all
}
