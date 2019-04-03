/**
 * Before component init.
 *
 * @export
 * @interface BeforeInit
 */
export interface BeforeInit {
    /**
     * component before init hooks. after constructor befor property inject.
     *
     * @memberof BeforeInit
     */
    beforeInit();
}

/**
 * on component init.
 *
 * @export
 * @interface OnInit
 */
export interface OnInit {
    /**
     * component on init hooks. after property inject.
     *
     * @memberof OnInit
     */
     onInit();
}

/**
 * after component init.
 *
 * @export
 * @interface AfterInit
 */
export interface AfterInit {
    /**
     * component after init hooks. after property inject.
     *
     * @memberof AfterInit
     */
    afterInit();
}

/**
 * after component destory.
 *
 * @export
 * @interface OnDestroy
 */
export interface OnDestroy {
    /**
     * component after destory hooks. after property inject.
     *
     * @memberof OnDestroy
     */
    onDestroy();
}


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
