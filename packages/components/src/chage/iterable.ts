
/**
 * A type describing supported iterable types.
 *
 * @publicApi
 */
export type IterableType<T> = Array<T> | Iterable<T>;


/**
 * A strategy for tracking changes over time to an iterable. Used by {@link DirEach} to
 * respond to changes in an iterable by effecting equivalent changes in the DOM.
 *
 * @publicApi
 */
export interface IterableDiffer<V> {
    /**
     * Compute a difference between the previous state and the new `object` state.
     *
     * @param object containing the new value.
     * @returns an object describing the difference. The return value is only valid until the next
     * `diff()` invocation.
     */
    diff(object: IterableType<V> | undefined | null): IterableChanges<V> | null;
}

/**
 * An object describing the changes in the `Iterable` collection since last time
 * `IterableDiffer#diff()` was invoked.
 *
 * @publicApi
 */
export interface IterableChanges<V> {
    /**
     * Iterate over all changes. `IterableChangeRecord` will contain information about changes
     * to each item.
     */
    forEachItem(fn: (record: IterableChangeRecord<V>) => void): void;

    /**
     * Iterate over a set of operations which when applied to the original `Iterable` will produce the
     * new `Iterable`.
     *
     * NOTE: These are not necessarily the actual operations which were applied to the original
     * `Iterable`, rather these are a set of computed operations which may not be the same as the
     * ones applied.
     *
     * @param record A change which needs to be applied
     * @param previousIndex The `IterableChangeRecord#previousIndex` of the `record` refers to the
     *        original `Iterable` location, where as `previousIndex` refers to the transient location
     *        of the item, after applying the operations up to this point.
     * @param currentIndex The `IterableChangeRecord#currentIndex` of the `record` refers to the
     *        original `Iterable` location, where as `currentIndex` refers to the transient location
     *        of the item, after applying the operations up to this point.
     */
    forEachOperation(
        fn:
            (record: IterableChangeRecord<V>, previousIndex: number | null,
                currentIndex: number | null) => void): void;

    /**
     * Iterate over changes in the order of original `Iterable` showing where the original items
     * have moved.
     */
    forEachPreviousItem(fn: (record: IterableChangeRecord<V>) => void): void;

    /** Iterate over all added items. */
    forEachAddedItem(fn: (record: IterableChangeRecord<V>) => void): void;

    /** Iterate over all moved items. */
    forEachMovedItem(fn: (record: IterableChangeRecord<V>) => void): void;

    /** Iterate over all removed items. */
    forEachRemovedItem(fn: (record: IterableChangeRecord<V>) => void): void;

    /**
     * Iterate over all items which had their identity (as computed by the `TrackByFunction`)
     * changed.
     */
    forEachIdentityChange(fn: (record: IterableChangeRecord<V>) => void): void;
}

/**
 * Record representing the item change information.
 *
 * @publicApi
 */
export interface IterableChangeRecord<V> {
    /** Current index of the item in `Iterable` or null if removed. */
    readonly currentIndex: number | null;

    /** Previous index of the item in `Iterable` or null if added. */
    readonly previousIndex: number | null;

    /** The item. */
    readonly item: V;

    /** Track by identity as computed by the `TrackByFunction`. */
    readonly trackById: any;
}

/**
 * @deprecated v4.0.0 - Use IterableChangeRecord instead.
 * @publicApi
 */
export interface CollectionChangeRecord<V> extends IterableChangeRecord<V> { }

/**
 * An optional function passed into the `NgForOf` directive that defines how to track
 * changes for items in an iterable.
 * The function takes the iteration index and item ID.
 * When supplied, Angular tracks changes by the return value of the function.
 *
 * @publicApi
 */
export interface TrackByFunction<T> {
    (index: number, item: T): any;
}

/**
 * Provides a factory for {@link IterableDiffer}.
 *
 * @publicApi
 */
export interface IterableDifferFactory {
    supports(objects: any): boolean;
    create<V>(trackByFn?: TrackByFunction<V>): IterableDiffer<V>;
}

/**
 * A repository of different iterable diffing strategies used by NgFor, NgClass, and others.
 *
 * @publicApi
 */
export class IterableDiffers {

    constructor(private factories: IterableDifferFactory[]) { }

    static create(factories: IterableDifferFactory[], parent?: IterableDiffers): IterableDiffers {
        if (parent != null) {
            const copied = parent.factories.slice();
            factories = factories.concat(copied);
        }

        return new IterableDiffers(factories);
    }

    find(iterable: any): IterableDifferFactory {
        const factory = this.factories.find(f => f.supports(iterable));
        if (factory != null) {
            return factory;
        } else {
            throw new Error(`Cannot find a differ supporting object '${iterable}' of type '${getTypeNameForDebugging(iterable)}'`);
        }
    }
}

export function getTypeNameForDebugging(type: any): string {
    return type['name'] || typeof type;
}