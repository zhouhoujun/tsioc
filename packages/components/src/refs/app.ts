import { Injectable, lang, Type } from '@tsdi/ioc';
import { OnDestroy } from '../lifecycle';
import { ComponentRef } from './component';
import { InternalViewRef } from './inter';
import { ViewRef } from './view';

@Injectable()
export class ApplicationRef implements OnDestroy {

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