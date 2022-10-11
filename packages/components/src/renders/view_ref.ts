import { InternalViewRef, ViewRefTracker } from '../refs/inter';
import { EmbeddedViewRef } from '../refs/view';
import { VIEW_REFS } from '../interfaces/container';
import { CONTEXT, FLAGS, INJECTOR, LView, LViewFlags, PARENT, TVIEW } from '../interfaces/view';
import { isLContainer } from '../interfaces/chk';
import { collectNativeNodes } from './native_nodes';
import { destroyLView, detachView, renderDetachView } from './manipulation';
import { removeFromArray } from '../util/array';
import { checkNoChangesInRootView, checkNoChangesInternal, detectChangesInRootView, detectChangesInternal, markViewDirty, storeCleanupWithContext } from './share';
import { RuntimeErrorCode, RuntimeExecption } from '../errors';

declare let devMode: boolean;
/**
 * viewRef implement.
 */
export class ViewRefImpl<T = any> extends EmbeddedViewRef<T> implements InternalViewRef {
    private _appRef: ViewRefTracker | null = null;
    private _attachedToViewContainer = false;

    get rootNodes(): any[] {
        const lView = this._lView;
        const view = lView[TVIEW];
        return collectNativeNodes(view, lView, view.firstChild, []);
    }

    constructor(
        /**
         * This represents `LView` associated with the component when ViewRef is a ChangeDetectorRef.
         *
         * When ViewRef is created for a dynamic component, this also represents the `LView` for the
         * component.
         *
         * For a "regular" ViewRef created for an embedded view, this is the `LView` for the embedded
         * view.
         *
         * @internal
         */
        public _lView: LView,

        /**
         * This represents the `LView` associated with the point where `ChangeDetectorRef` was
         * requested.
         *
         * This may be different from `_lView` if the `_cdRefInjectingView` is an embedded view.
         */
        private _cdRefInjectingView?: LView) {
        super();
    }

    get context(): T {
        return this._lView[CONTEXT] as T;
    }

    set context(value: T) {
        this._lView[CONTEXT] = value;
    }

    get destroyed(): boolean {
        return (this._lView[FLAGS] & LViewFlags.Destroyed) === LViewFlags.Destroyed;
    }

    destroy(): void {
        if (this._appRef) {
            this._appRef.detachView(this);
        } else if (this._attachedToViewContainer) {
            const parent = this._lView[PARENT];
            if (isLContainer(parent)) {
                const viewRefs = parent[VIEW_REFS] as ViewRefImpl[] | null;
                const index = viewRefs ? viewRefs.indexOf(this) : -1;
                if (index > -1) {
                    detachView(parent, index);
                    removeFromArray(viewRefs!, index);
                }
            }
            this._attachedToViewContainer = false;
        }
        destroyLView(this._lView[TVIEW], this._lView);
    }

    onDestroy(callback: Function) {
        storeCleanupWithContext(this._lView[TVIEW], this._lView, null, callback);
    }

    /**
     * Marks a view and all of its ancestors dirty.
     *
     * It also triggers change detection by calling `scheduleTick` internally, which coalesces
     * multiple `markForCheck` calls to into one change detection run.
     *
     * This can be used to ensure an {@link ChangeDetectionStrategy#OnPush OnPush} component is
     * checked when it needs to be re-rendered but the two normal triggers haven't marked it
     * dirty (i.e. inputs haven't changed and events haven't fired in the view).
     *
     * <!-- TODO: Add a link to a chapter on OnPush components -->
     *
     * @usageNotes
     * ### Example
     *
     * ```typescript
     * @Component({
     *   selector: 'my-app',
     *   template: `Number of ticks: {{numberOfTicks}}`
     *   changeDetection: ChangeDetectionStrategy.OnPush,
     * })
     * class AppComponent {
     *   numberOfTicks = 0;
     *
     *   constructor(private ref: ChangeDetectorRef) {
     *     setInterval(() => {
     *       this.numberOfTicks++;
     *       // the following is required, otherwise the view will not be updated
     *       this.ref.markForCheck();
     *     }, 1000);
     *   }
     * }
     * ```
     */
    markForCheck(): void {
        markViewDirty(this._cdRefInjectingView || this._lView);
    }

    /**
     * Detaches the view from the change detection tree.
     *
     * Detached views will not be checked during change detection runs until they are
     * re-attached, even if they are dirty. `detach` can be used in combination with
     * {@link ChangeDetectorRef#detectChanges detectChanges} to implement local change
     * detection checks.
     *
     * <!-- TODO: Add a link to a chapter on detach/reattach/local digest -->
     * <!-- TODO: Add a live demo once ref.detectChanges is merged into master -->
     *
     * @usageNotes
     * ### Example
     *
     * The following example defines a component with a large list of readonly data.
     * Imagine the data changes constantly, many times per second. For performance reasons,
     * we want to check and update the list every five seconds. We can do that by detaching
     * the component's change detector and doing a local check every five seconds.
     *
     * ```typescript
     * class DataProvider {
     *   // in a real application the returned data will be different every time
     *   get data() {
     *     return [1,2,3,4,5];
     *   }
     * }
     *
     * @Component({
     *   selector: 'giant-list',
     *   template: `
     *     <li *ngFor="let d of dataProvider.data">Data {{d}}</li>
     *   `,
     * })
     * class GiantList {
     *   constructor(private ref: ChangeDetectorRef, private dataProvider: DataProvider) {
     *     ref.detach();
     *     setInterval(() => {
     *       this.ref.detectChanges();
     *     }, 5000);
     *   }
     * }
     *
     * @Component({
     *   selector: 'app',
     *   providers: [DataProvider],
     *   template: `
     *     <giant-list><giant-list>
     *   `,
     * })
     * class App {
     * }
     * ```
     */
    detach(): void {
        this._lView[FLAGS] &= ~LViewFlags.Attached;
    }

    /**
     * Re-attaches a view to the change detection tree.
     *
     * This can be used to re-attach views that were previously detached from the tree
     * using {@link ChangeDetectorRef#detach detach}. Views are attached to the tree by default.
     *
     * <!-- TODO: Add a link to a chapter on detach/reattach/local digest -->
     *
     * @usageNotes
     * ### Example
     *
     * The following example creates a component displaying `live` data. The component will detach
     * its change detector from the main change detector tree when the component's live property
     * is set to false.
     *
     * ```typescript
     * class DataProvider {
     *   data = 1;
     *
     *   constructor() {
     *     setInterval(() => {
     *       this.data = this.data * 2;
     *     }, 500);
     *   }
     * }
     *
     * @Component({
     *   selector: 'live-data',
     *   inputs: ['live'],
     *   template: 'Data: {{dataProvider.data}}'
     * })
     * class LiveData {
     *   constructor(private ref: ChangeDetectorRef, private dataProvider: DataProvider) {}
     *
     *   set live(value) {
     *     if (value) {
     *       this.ref.reattach();
     *     } else {
     *       this.ref.detach();
     *     }
     *   }
     * }
     *
     * @Component({
     *   selector: 'my-app',
     *   providers: [DataProvider],
     *   template: `
     *     Live Update: <input type="checkbox" [(ngModel)]="live">
     *     <live-data [live]="live"><live-data>
     *   `,
     * })
     * class AppComponent {
     *   live = true;
     * }
     * ```
     */
    reattach(): void {
        this._lView[FLAGS] |= LViewFlags.Attached;
    }

    /**
     * Checks the view and its children.
     *
     * This can also be used in combination with {@link ChangeDetectorRef#detach detach} to implement
     * local change detection checks.
     *
     * <!-- TODO: Add a link to a chapter on detach/reattach/local digest -->
     * <!-- TODO: Add a live demo once ref.detectChanges is merged into master -->
     *
     * @usageNotes
     * ### Example
     *
     * The following example defines a component with a large list of readonly data.
     * Imagine, the data changes constantly, many times per second. For performance reasons,
     * we want to check and update the list every five seconds.
     *
     * We can do that by detaching the component's change detector and doing a local change detection
     * check every five seconds.
     *
     * See {@link ChangeDetectorRef#detach detach} for more information.
     */
    detectChanges(): void {
        detectChangesInternal(this._lView[TVIEW], this._lView, this.context);
    }

    /**
     * Checks the change detector and its children, and throws if any changes are detected.
     *
     * This is used in development mode to verify that running change detection doesn't
     * introduce other changes.
     */
    checkNoChanges(): void {
        if (devMode) {
            checkNoChangesInternal(this._lView[TVIEW], this._lView, this.context);
        }
    }

    attachToViewContainerRef() {
        if (this._appRef) {
            const errorMessage =
                devMode ? 'This view is already attached directly to the ApplicationRef!' : '';
            throw new RuntimeExecption(RuntimeErrorCode.VIEW_ALREADY_ATTACHED, errorMessage);
        }
        this._attachedToViewContainer = true;
    }

    detachFromAppRef() {
        this._appRef = null;
        renderDetachView(this._lView[TVIEW], this._lView);
    }

    attachToAppRef(appRef: ViewRefTracker) {
        if (this._attachedToViewContainer) {
            const errorMessage = devMode ? 'This view is already attached to a ViewContainer!' : '';
            throw new RuntimeExecption(RuntimeErrorCode.VIEW_ALREADY_ATTACHED, errorMessage);
        }
        this._appRef = appRef;
    }
}

/**
 * Root view Ref.
 */
export class RootViewRef<T> extends ViewRefImpl<T> {
    constructor(public _view: LView) {
        super(_view);
    }

    override detectChanges(): void {
        detectChangesInRootView(this._view);
    }

    override checkNoChanges(): void {
        if (devMode) {
            checkNoChangesInRootView(this._view);
        }
    }

    override get context(): T {
        return null!;
    }
}
