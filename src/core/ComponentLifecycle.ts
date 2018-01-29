import { ClassMetadata } from './metadatas/index';

/**
 * component decorator class liefcycle hooks.
 *
 * @export
 * @interface ComponentLifecycle
 */
export interface ComponentLifecycle {

    /**
     * component before init hooks. after constructor befor property inject.
     *
     * @param {ClassMetadata[]} [metas]
     * @memberof ComponentLifecycle
     */
    beforeInit?(metas?: ClassMetadata[]);

    /**
     * component on init hooks. after property inject
     *
     * @param {ClassMetadata[]} [metas]
     * @memberof ComponentLifecycle
     */
    onInit(metas?: ClassMetadata[]);

    /**
     * component on destroy hooks.
     *
     * @memberof ComponentLifecycle
     */
    onDestroy?();
}
