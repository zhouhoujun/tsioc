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
    onBeforeInit(): void;
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
    onInit(): void;
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
    onAfterInit(): void;
}

/**
 * ater content init hooks.
 *
 * @export
 * @interface AfterContentInit
 */
export interface AfterContentInit {
    /**
     * component after content init hooks. after property inject.
     *
     * @memberof AfterInit
     */
    onAfterContentInit(): void;
}

/**
 * changes.
 */
export interface Changes {
    [p: string]: {previous: any, current: any, firstChange?: boolean}
}

/**
 * on changes.
 */
export interface OnChanges {
    onChanges(changs: Changes);
}

/**
 * after view init.
 *
 * @export
 * @interface AfterViewInit
 */
export interface AfterViewInit  {
    onAfterViewInit(): void;
}

/**
 * component destory hooks.
 *
 * @export
 * @interface AfterContentInit
 */
export interface OnDestory {
    /**
     * component destory hooks. invoke on component destory.
     *
     * @memberof AfterInit
     */
    onDestory(): void;
}
