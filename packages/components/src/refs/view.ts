import { Abstract, Type } from '@tsdi/ioc';
import { IBootContext } from '@tsdi/boot';
import { ChangeDetectorRef } from '../chage/detector';
import { ComponentRef } from './component';



/**
 * Represents an virtual view.
 *
 * @see {@link ChangeDetectorRef#usage-notes Change detection usage}
 *
 * @publicApi
 */
@Abstract()
export abstract class ViewRef extends ChangeDetectorRef { }

/**
 * Represents an Angular [view](guide/glossary#view) in a view container.
 * An [embedded view](guide/glossary#view-tree) can be referenced from a component
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


/**
 * component boot context.
 */
export interface IComponentBootContext extends IBootContext {

  readonly components: ComponentRef[];

  readonly componentTypes: Type[];
  /**
   * Detaches a view from dirty checking again.
   */
  detachView(viewRef: ViewRef): void;
  /**
   * attach view.
   * @param viewRef 
   */
  attachView(viewRef: ViewRef): void;
  /**
   * Invoke this method to explicitly process change detection and its side-effects.
   *
   * In development mode, `tick()` also performs a second change detection cycle to ensure that no
   * further changes are detected. If additional changes are picked up during this second cycle,
   * bindings in the app have side-effects that cannot be resolved in a single change detection
   * pass.
   * In this case, Angular throws an error, since an Angular application can only have one change
   * detection pass during which all change detection must complete.
   */
  tick(): void;
}

/**
 * internal view ref.
 */
export interface InternalViewRef extends ViewRef {
  /**
   * detach form app boot context.
   */
  detachContext(): void;
  /**
   * attach to app boot context.
   * @param ctx
   */
  attachContext(ctx: IComponentBootContext): void;
}
