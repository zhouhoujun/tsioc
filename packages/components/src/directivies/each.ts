import { lang } from '@tsdi/ioc';
import { IterableType, IterableDiffers, TrackByFunction, IterableDiffer, IterableChanges, IterableChangeRecord } from '../chage/iterable';
import { Directive, Input } from '../decorators';
import { DoCheck } from '../lifecycle';
import { ViewContainerRef } from '../refs/container';
import { TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';

/**
 * each context.
 * @publicApi
 */
export class DirEachContext<T, U extends IterableType<T> = IterableType<T>> {
    constructor(public $implicit: T, public eachOf: U, public index: number, public count: number) { }

    get first(): boolean {
        return this.index === 0;
    }

    get last(): boolean {
        return this.index === this.count - 1;
    }

    get even(): boolean {
        return this.index % 2 === 0;
    }

    get odd(): boolean {
        return !this.even;
    }
}

/**
 * A [structural directive] that renders
 * a template for each item in a collection.
 * The directive is placed on an element, which becomes the parent
 * of the cloned templates.
 *
 * The `eachOf` directive is generally used in the
 * [shorthand form] `[each]`.
 * In this form, the template to be rendered for each iteration is the content
 * of an anchor element containing the directive.
 *
 * The following example shows the shorthand syntax with some options,
 * contained in an `<li>` element.
 *
 * ```
 * <li *each="let item of items; index as i; trackBy: trackByFn">...</li>
 * ```
 *
 * The shorthand form expands into a long form that uses the `eachOf` selector
 * on an `<v-template>` element.
 * The content of the `<v-template>` element is the `<li>` element that held the
 * short-form directive.
 *
 * Here is the expanded version of the short-form example.
 *
 * ```
 * <v-template each let-item [eachOf]="items" let-i="index" [eachTrackBy]="trackByFn">
 *   <li>...</li>
 * </v-template>
 * ```
 *
 * @usageNotes
 *
 * ### Local variables
 *
 * `DirEach` provides exported values that can be aliased to local variables.
 * For example:
 *
 *  ```
 * <li *each="let user of users; index as i; first as isFirst">
 *    {{i}}/{{users.length}}. {{user}} <span *ngIf="isFirst">default</span>
 * </li>
 * ```
 *
 * The following exported values can be aliased to local variables:
 *
 * - `$implicit: T`: The value of the individual items in the iterable (`eachOf`).
 * - `eachOf: ItemIterable<T>`: The value of the iterable expression. Useful when the expression is
 * more complex then a property access, for example when using the async pipe (`userStreams |
 * async`).
 * - `index: number`: The index of the current item in the iterable.
 * - `count: number`: The length of the iterable.
 * - `first: boolean`: True when the item is the first item in the iterable.
 * - `last: boolean`: True when the item is the last item in the iterable.
 * - `even: boolean`: True when the item has an even index in the iterable.
 * - `odd: boolean`: True when the item has an odd index in the iterable.
 *
 * ### Change propagation
 *
 * When the contents of the iterator changes, `DirEach` makes the corresponding changes to the DOM:
 *
 * * When an item is added, a new instance of the template is added to the DOM.
 * * When an item is removed, its template instance is removed from the DOM.
 * * When items are reordered, their respective templates are reordered in the DOM.
 *
 * Components uses object identity to track insertions and deletions within the iterator and reproduce
 * those changes in the DOM. This has important implications for animations and any stateful
 * controls that are present, such as `<input>` elements that accept user input. Inserted rows can
 * be animated in, deleted rows can be animated out, and unchanged rows retain any unsaved state
 * such as user input.
 *
 * The identities of elements in the iterator can change while the data does not.
 * This can happen, for example, if the iterator is produced from an RPC to the server, and that
 * RPC is re-run. Even if the data hasn't changed, the second response produces objects with
 * different identities, and Components must tear down the entire DOM and rebuild it (as if all old
 * elements were deleted and all new elements inserted).
 *
 * To avoid this expensive operation, you can customize the default tracking algorithm.
 * by supplying the `eachTrackBy` option to `DirEach`.
 * `eachTrackBy` takes a function that has two arguments: `index` and `item`.
 * If `eachTrackBy` is given, Components tracks changes by the return value of the function.
 *
 * @publicApi
 */
@Directive({ selector: '[each][forEach]' })
export class DirEach<T, U extends IterableType<T> = IterableType<T>> implements DoCheck {
    /**
     * The value of the iterable expression, which can be used as a
     * template input variable.
     */
    @Input()
    set each(iterate: U & IterableType<T> | undefined | null) {
        this._iter = iterate;
        this._iterDirty = true;
    }
    /**
     * A function that defines how to track changes for items in the iterable.
     *
     * When items are added, moved, or removed in the iterable,
     * the directive must re-render the appropriate DOM nodes.
     * To minimize churn in the DOM, only nodes that have changed
     * are re-rendered.
     *
     * By default, the change detector assumes that
     * the object instance identifies the node in the iterable.
     * When this function is supplied, the directive uses
     * the result of calling this function to identify the item node,
     * rather than the identity of the object itself.
     *
     * The function receives two inputs,
     * the iteration index and the associated node data.
     */
    @Input()
    set eachTrackBy(fn: TrackByFunction<T>) {
        this._trackByFn = fn;
    }

    get eachTrackBy(): TrackByFunction<T> {
        return this._trackByFn;
    }

    private _iter: U | undefined | null = null;
    private _iterDirty = true;
    private _differ: IterableDiffer<T> | null = null;
    private _trackByFn?: TrackByFunction<T>;

    constructor(
        private _viewContainer: ViewContainerRef,
        private _template: TemplateRef<DirEachContext<T, U>>, private _differs: IterableDiffers) { }

    /**
     * A reference to the template that is stamped out for each item in the iterable.
     */
    @Input()
    set eachTemplate(value: TemplateRef<DirEachContext<T, U>>) {
        if (value) {
            this._template = value;
        }
    }

    /**
     * Applies the changes when needed.
     */
    onDoCheck(): void {
        if (this._iterDirty) {
            this._iterDirty = false;
            const value = this._iter;
            if (!this._differ && value) {
                try {
                    this._differ = this._differs.find(value).create(this.eachTrackBy);
                } catch {
                    throw new Error(`Cannot find a differ supporting object '${value}' of type '${getTypeName(value)}'. DirEach only supports binding to Iterables such as Arrays.`);
                }
            }
        }
        if (this._differ) {
            const changes = this._differ.diff(this._iter);
            if (changes) this._applyChanges(changes);
        }
    }

    private _applyChanges(changes: IterableChanges<T>) {
        const insertTuples: RecordViewTuple<T, U>[] = [];
        changes.forEachOperation(
            (item: IterableChangeRecord<any>, adjustedPreviousIndex: number | null,
                currentIndex: number | null) => {
                if (item.previousIndex == null) {
                    const view = this._viewContainer.createEmbeddedView(
                        this._template, new DirEachContext<T, U>(null!, this._iter!, -1, -1),
                        currentIndex === null ? undefined : currentIndex);
                    const tuple = new RecordViewTuple<T, U>(item, view);
                    insertTuples.push(tuple);
                } else if (currentIndex == null) {
                    this._viewContainer.remove(
                        adjustedPreviousIndex === null ? undefined : adjustedPreviousIndex);
                } else if (adjustedPreviousIndex !== null) {
                    const view = this._viewContainer.get(adjustedPreviousIndex)!;
                    this._viewContainer.move(view, currentIndex);
                    const tuple = new RecordViewTuple(item, <EmbeddedViewRef<DirEachContext<T, U>>>view);
                    insertTuples.push(tuple);
                }
            });

        for (let i = 0; i < insertTuples.length; i++) {
            this._perViewChange(insertTuples[i].view, insertTuples[i].record);
        }

        for (let i = 0, ilen = this._viewContainer.length; i < ilen; i++) {
            const viewRef = <EmbeddedViewRef<DirEachContext<T, U>>>this._viewContainer.get(i);
            viewRef.context.index = i;
            viewRef.context.count = ilen;
            viewRef.context.eachOf = this._iter!;
        }

        changes.forEachIdentityChange((record: any) => {
            const viewRef =
                <EmbeddedViewRef<DirEachContext<T, U>>>this._viewContainer.get(record.currentIndex);
            viewRef.context.$implicit = record.item;
        });
    }

    private _perViewChange(
        view: EmbeddedViewRef<DirEachContext<T, U>>, record: IterableChangeRecord<any>) {
        view.context.$implicit = record.item;
    }
}

class RecordViewTuple<T, U extends IterableType<T>> {
    constructor(public record: any, public view: EmbeddedViewRef<DirEachContext<T, U>>) { }
}

function getTypeName(type: any): string {
    return lang.getClassName(type) || typeof type;
}
