import { Injectable, lang, Type } from '@tsdi/ioc';
import { OnDestroy } from '../lifecycle';
import { ComponentRef } from './component';
import { InternalViewRef } from './inter';
import { ViewRef } from './view';

@Injectable()
export class ApplicationRef implements OnDestroy {

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


  tick(): void {
    if (this._runningTick) {
      throw new Error('ApplicationRef.tick is called recursively');
    }

    try {
      this._runningTick = true;
      for (let view of this._views) {
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
