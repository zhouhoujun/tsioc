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
 * @description
 * A lifecycle hook that is called after the default change detector has
 * completed checking all content of a directive.
 *
 * @see `AfterViewChecked`
 * @see [Lifecycle hooks guide](guide/lifecycle-hooks)
 *
 * @usageNotes
 * The following snippet shows how a component can implement this interface to
 * define its own after-check functionality.
 *
 * @publicApi
 */
export interface AfterContentChecked {
    /**
     * A callback method that is invoked immediately after the
     * default change detector has completed checking all of the directive's
     * content.
     */
    onAfterContentChecked(): void;
}

/**
 * A lifecycle hook that invokes a custom change-detection function for a directive,
 * in addition to the check performed by the default change-detector.
 *
 * The default change-detection algorithm looks for differences by comparing
 * bound-property values by reference across change detection runs. You can use this
 * hook to check for and respond to changes by some other means.
 *
 * When the default change detector detects changes, it invokes `onChanges()` if supplied,
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
 * @description
 * A lifecycle hook that is called after the default change detector has
 * completed checking a component's view for changes.
 *
 * @see `AfterContentChecked`
 * @see [Lifecycle hooks guide](guide/lifecycle-hooks)
 *
 * @usageNotes
 * The following snippet shows how a component can implement this interface to
 * define its own after-check functionality.
 *
 * @publicApi
 */
export interface AfterViewChecked {
    /**
     * A callback method that is invoked immediately after the
     * default change detector has completed one change-check cycle
     * for a component's view.
     */
    onAfterViewChecked(): void;
}


/**
 * component destroy hooks.
 *
 * @export
 * @interface AfterContentInit
 */
export interface OnDestroy {
    /**
     * component destroy hooks. invoke on component destory.
     *
     * @memberof AfterInit
     */
    onDestroy(): void;
}
