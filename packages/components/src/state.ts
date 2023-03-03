import { Injectable, Injector, InvocationContext, ModuleRef, isFunction, lang, Type, TypeDef } from '@tsdi/ioc';
import { OnDestroy } from './lifecycle';
import { ComponentRef } from './refs/component';
import { ViewRef, InternalViewRef } from './refs/view';
import { ViewContainerRef } from './refs/container';

@Injectable()
export class ComponentState implements OnDestroy {

  constructor(public context: InvocationContext) { }

  private _runningTick = false;
  private _views: InternalViewRef[] = [];
  /**
   * Get a list of component types registered to this application.
   * This list is populated even before the component is created.
   */
  public readonly componentTypes: Type[] = [];

  /**
   * Get a list of components registered to this application.
   */
  public readonly components: ComponentRef<any>[] = [];

  /**
   * bootstrap component ref.
   * @param compRef 
   */
  bootstrap<C>(component: Type<C> | ComponentRef<C>, options?: {
    rootSelector?: string;
    rootNode?: any;
    index?: number,
    injector?: Injector,
    moduleRef?: ModuleRef,
    context?: InvocationContext,
    projectableNodes?: Node[][],
  }): ComponentRef<C> {
    const compRef = isFunction(component) ? this.context.get(ViewContainerRef).createComponent(component, { context: this.context, ...options }) as ComponentRef<C> : component;
    this.componentTypes.push(compRef.type);
    compRef.onDestroy(() => {
      this.detachView(compRef.hostView);
      lang.remove(this.components, compRef);
    });

    this.attachView(compRef.hostView);
    this.tick();
    this.components.push(compRef);
    return compRef;
  }

  tick(): void {
    if (this._runningTick) {
      throw new Error('ApplicationRef.tick is called recursively');
    }

    try {
      this._runningTick = true;
      for (const view of this._views) {
        view.detectChanges();
      }
    } catch (e) {
      // Attention: Don't rethrow as it could cancel subscriptions to Observables!
      // this._zone.runOutsideAngular(() => this._exceptionHandler.handleError(e));
    } finally {
      this._runningTick = false;
    }
  }

  /**
 * Attaches a view so that it will be dirty checked.
 * The view will be automatically detached when it is destroyed.
 * This will throw if the view is already attached to a ViewContainer.
 */
  attachView(viewRef: ViewRef): void {
    const view = (viewRef as InternalViewRef);
    this._views.push(view);
    view.attachToAppRef(this);
  }

  /**
   * Detaches a view from dirty checking again.
   */
  detachView(viewRef: ViewRef): void {
    const view = (viewRef as InternalViewRef);
    lang.remove(this._views, view);
    view.detachFromAppRef();
  }

  onDestroy() {
    this._views.slice().forEach((view) => view.destroy());
  }

}
