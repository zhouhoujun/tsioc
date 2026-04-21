export { OnDestroy } from '@tsdi/ioc';
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
    [p: string]: Change;
}
/**
 * on changes.
 */
export interface OnChanges {
    onChanges(changs: Changes): void;
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
    onAfterContentInit(): void | Promise<void>;
}
/**
 * after view init.
 *
 * @export
 * @interface AfterViewInit
 */
export interface AfterViewInit {
    /**
     * A callback method that is invoked immediately afater view initialization.
     */
    onAfterViewInit(): void | Promise<void>;
}
