import { ClassMetadata } from './metadatas/index';

/**
 * component decorator class liefcycle hooks.
 *
 * @export
 * @interface ComponentLifecycle
 */
export interface ComponentLifecycle {
    /**
     * component on init hooks.
     *
     * @param {ClassMetadata[]} [metas]
     * @memberof ComponentLifecycle
     */
    onInit?(metas?: ClassMetadata[]);
    /**
     * component on destroy hooks.
     *
     * @memberof ComponentLifecycle
     */
    onDestroy?();
}
