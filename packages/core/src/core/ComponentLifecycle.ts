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
     * after component init.
     *
     * @memberof ComponentLifecycle
     */
    afterInit?();

    /**
     * component on destroy hooks.
     *
     * @memberof ComponentLifecycle
     */
    onDestroy?();
}
