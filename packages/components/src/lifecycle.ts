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
 * change.
 */
export interface Change {
    previousValue: any;
    currentValue: any;
    firstChange?: boolean;
}
/**
 * changes.
 */
export interface Changes {
    [p: string]: Change
}

/**
 * on changes.
 */
export interface OnChanges {
    onChanges(changs: Changes);
}


/**
 * A lifecycle hook that invokes a custom change-detection function for a directive,
 * in addition to the check performed by the default change-detector.
 *
 * The default change-detection algorithm looks for differences by comparing
 * bound-property values by reference across change detection runs. You can use this
 * hook to check for and respond to changes by some other means.
 *
 * When the default change detector detects changes, it invokes `ngOnChanges()` if supplied,
 * regardless of whether you perform additional change detection.
 * Typically, you should not use both `DoCheck` and `OnChanges` to respond to
 * changes on the same input.
 *
 * @see `OnChanges`
 *
 * @usageNotes
 * The following snippet shows how a component can implement this interface
 * to invoke it own change-detection cycle.
 *
 * @publicApi
 */
export interface DoCheck {
    /**
     * A callback method that performs change-detection, invoked
     * after the default change-detector runs.
     * See `KeyValueDiffers` and `IterableDiffers` for implementing
     * custom change checking for collections.
     *
     */
    onDoCheck(): void;
}


/**
 * after view init.
 *
 * @export
 * @interface AfterViewInit
 */
export interface AfterViewInit {
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
