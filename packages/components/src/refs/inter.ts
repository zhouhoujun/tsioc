import { ViewRef } from './view';

/**
 * internal view ref.
 */
export interface InternalViewRef extends ViewRef {
    detachFromAppRef(): void;
    attachToAppRef(appRef: ViewRefTracker): void;
}

/**
 * Interface for tracking root `ViewRef`s in `ApplicationRef`.
 *
 * NOTE: Importing `ApplicationRef` here directly creates circular dependency, which is why we have
 * a subset of the `ApplicationRef` interface `ViewRefTracker` here.
 */
export interface ViewRefTracker {
    detachView(viewRef: ViewRef): void;
}
