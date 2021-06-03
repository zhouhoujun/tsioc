import { Injector, DefaultInjector, refl, Type } from '@tsdi/ioc';
import { ChangeDetectorRef } from '../chage/detector';
import { ComponentReflect } from '../reflect';
import { ComponentRef } from '../refs/component';
import { ElementRef } from '../refs/element';
import { INJECTOR, LView } from './interfaces/view';
import { VContainerNode, VElementContainerNode, VElementNode } from './interfaces/vnode';
import { RootViewRef, ViewRef } from './view_ref';

/**
 * component ref.
 */
export class VComponentRef<T> extends ComponentRef<T> {
  hostView: ViewRef<T>;
  changeDetectorRef: ChangeDetectorRef;
  private _injector: Injector;

  constructor(
    public type: Type<T>,
    public instance: T,
    public location: ElementRef,
    private _rootLView: LView,
    private _tNode: VElementNode | VContainerNode | VElementContainerNode) {
    super();
    this.hostView = this.changeDetectorRef = new RootViewRef<T>(_rootLView);
  }

  

  get injector(): Injector {
    if (!this._injector) {
      const tyInj = this._rootLView[INJECTOR].state().getInjector(this.type);
      this._injector = new DefaultInjector(tyInj);
      const providers = refl.get<ComponentReflect>(this.type).extProviders;
      if (providers && providers.length) {
        this._injector.inject(providers);
      }
    }
    return this._injector;
  }

  destroy(): void {
    this.hostView.destroy();
    this.injector?.destroy();
  }

  onDestroy(callback: () => void): void {
    this.hostView.onDestroy(callback);
  }
}