import { Abstract, Destroyable } from '@tsdi/ioc';
import { ChangeDetectorRef } from '../chage/detector';



/**
 * Represents an virtual view.
 *
 * @see {@link ChangeDetectorRef#usage-notes Change detection usage}
 *
 * @publicApi
 */
@Abstract()
export abstract class ViewRef extends ChangeDetectorRef implements Destroyable {

  /**
   * has destoryed or not.
   */
  abstract get destroyed();
  /**
  * destory this.
  */
  abstract destroy(): void;

  /**
   * register callback on destory.
   * @param callback destory callback
   */
  abstract onDestroy(callback: () => void): void;

}

/**
 * Represents in a view container.
 * An can be referenced from a component
 * other than the hosting component whose template defines it, or it can be defined
 * independently by a `TemplateRef`.
 *
 * Properties of elements in a view can change, but the structure (number and order) of elements in
 * a view cannot. Change the structure of elements by inserting, moving, or
 * removing nested views in a view container.
 *
 * @see `ViewContainerRef`
 *
 * @usageNotes
 *
 * The following template breaks down into two separate `TemplateRef` instances,
 * an outer one and an inner one.
 *
 * ```
 * Count: {{items.length}}
 * <ul>
 *   <li *ngFor="let  item of items">{{item}}</li>
 * </ul>
 * ```
 *
 * This is the outer `TemplateRef`:
 *
 * ```
 * Count: {{items.length}}
 * <ul>
 *   <v-template ngFor let-item [ngForOf]="items"></v-template>
 * </ul>
 * ```
 *
 * This is the inner `TemplateRef`:
 *
 * ```
 *   <li>{{item}}</li>
 * ```
 *
 * The outer and inner `TemplateRef` instances are assembled into views as follows:
 *
 * ```
 * <!-- ViewRef: outer-0 -->
 * Count: 2
 * <ul>
 *   <v-template view-container-ref></v-template>
 *   <!-- ViewRef: inner-1 --><li>first</li><!-- /ViewRef: inner-1 -->
 *   <!-- ViewRef: inner-2 --><li>second</li><!-- /ViewRef: inner-2 -->
 * </ul>
 * <!-- /ViewRef: outer-0 -->
 * ```
 * @publicApi
 */
@Abstract()
export abstract class EmbeddedViewRef<C> extends ViewRef {
  /**
   * The context for this view, inherited from the anchor element.
   */
  abstract get context(): C;

  /**
   * The root nodes for this embedded view.
   */
  abstract get rootNodes(): any[];
}
