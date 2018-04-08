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
     * @memberof ComponentLifecycle
     */
    beforeInit?();

    /**
     * component on init hooks. after property inject
     *
     * @memberof ComponentLifecycle
     */
    onInit?();

    /**
     * component on destroy hooks.
     *
     * @memberof ComponentLifecycle
     */
    onDestroy?();
}
