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
    beforeInit(): void | Promise<void>;
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
    onInit(): void | Promise<void>;
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
    afterInit(): void | Promise<void>;
}

