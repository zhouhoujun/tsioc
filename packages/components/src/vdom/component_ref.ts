import { Injector, refl, Type } from '@tsdi/ioc';
import { ChangeDetectorRef } from '../chage/detector';
import { ComponentReflect } from '../reflect';
import { ComponentRef } from '../refs/component';
import { ElementRef } from '../refs/element';
import { INJECTOR, LView } from './interfaces/view';
import { TContainerNode, TElementContainerNode, TElementNode } from './interfaces/node';
import { RootViewRef, ViewRef } from './view_ref';

/**
 * component ref.
 */
export class VComponentRef<T> extends ComponentRef<T> {
  hostView: ViewRef<T>;
  changeDetectorRef: ChangeDetectorRef;

  constructor(
    public type: Type<T>,
    public instance: T,
    public location: ElementRef,
    private _rootLView: LView,
    private _tNode: TElementNode | TContainerNode | TElementContainerNode) {
    super();
    this.hostView = this.changeDetectorRef = new RootViewRef<T>(_rootLView);
  }



  // get injector(): Injector {
  //   if (!this._injector) {
  //     const tyInj = this._rootLView[INJECTOR]?.platform().getInjector(this.type);
  //     this._injector = Injector.create(refl.get<ComponentReflect>(this.type).providers, tyInj);
  //   }
  //   return this._injector;
  // }

  destroy(): void {
    this.hostView.destroy();
    this.injector?.destroy();
  }

  onDestroy(callback: () => void): void {
    this.hostView.onDestroy(callback);
  }
}