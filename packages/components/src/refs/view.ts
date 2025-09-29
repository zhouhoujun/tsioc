import { Abstract, Destroyable, Type } from '@tsdi/ioc';
import { RElement, RNode } from '../renderer/Node';
import { ComponentRef } from './component';
import { DirectiveRef } from './directive';
import { TemplateRef } from './template';
import { ViewContainerRef } from './container';
import { ElementRef } from './element';
import { EnvironmentContext } from './environment';



/**
 * Represents an virtual view.
 *
 * @publicApi
 */
@Abstract()
export abstract class ViewRef<C = any> implements Destroyable {

  /**
   * The context for this view, inherited from the anchor element.
   */
  abstract context: C;


  abstract get rootNodes(): any[];
  /**
   * has destoryed or not.
   */
  abstract get destroyed(): boolean;
  /**
  * destroy this.
  */
  abstract destroy(): void;

  /**
   * register callback on destroy.
   * @param callback destroy callback
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
 *   <li *each="let  item of items">{{item}}</li>
 * </ul>
 * ```
 *
 * This is the outer `TemplateRef`:
 *
 * ```
 * Count: {{items.length}}
 * <ul>
 *   <v-template each let-item [eachOf]="items"></v-template>
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
export abstract class EmbeddedViewRef<C> extends ViewRef<C> {
  
  /**
   * The root nodes for this embedded view.
   */
  abstract get rootNodes(): any[];
  /**
   * The environment context for this view.
   */
  abstract get environment(): EnvironmentContext;

  // 添加计算属性缓存
  abstract get computedCache(): Map<string, { value: any, deps: Set<any> }>;

  abstract bindComponentRef<T>(el: RNode, componentRef: ComponentRef<T>): void;
  abstract bindDirectiveRef<T>(el: RNode, directiveRef: DirectiveRef<T>): void;
  abstract bindTemplateRef<T>(el: RNode, templateRef: TemplateRef<T>): void;

  abstract query<T>(selector: Type<T>): ComponentRef<T> | DirectiveRef<T> | null;
  abstract query<C>(selector: string): ElementRef<C> | ViewRef<C> | TemplateRef<C> | null;

  abstract queryAll<T>(selector: Type<T>): Array<ComponentRef<T> | DirectiveRef<T>>;
  abstract queryAll<C>(selector: string): Array<ElementRef<C> | ViewRef<C> | TemplateRef<C>>;

}