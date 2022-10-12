import { Injector, Type, InjectorScope, Scopes } from '@tsdi/ioc';
import { ChangeDetectorRef } from '../chage/detector';
import { ComponentRef } from '../refs/component';
import { ElementRef } from '../refs/element';
import { INJECTOR, LView } from '../interfaces/view';
import { TContainerNode, TElementContainerNode, TElementNode } from '../interfaces/node';
import { RootViewRef, ViewRefImpl } from './view_ref';
import { ComponentDef } from '../type';

/**
 * component ref.
 */
export class ComponentRefImpl<T> extends ComponentRef<T> {
  private _injector?: Injector;
  private _type: Type<T>;
  private _destroyed = false;

  hostView: ViewRefImpl<T>;
  changeDetectorRef: ChangeDetectorRef;
  constructor(
    public def: ComponentDef<T>,
    public instance: T,
    public location: ElementRef,
    private _rootLView: LView,
    private _tNode: TElementNode | TContainerNode | TElementContainerNode) {
    super();
    this._type = def.type;
    this.hostView = this.changeDetectorRef = new RootViewRef<T>(_rootLView);
  }


  get type(): Type<T> {
    return this._type;
  }
  get destroyed(): boolean {
    return this._destroyed;
  }
  

  get injector(): Injector {
    if (!this._injector) {
      const tyInj = this._rootLView[INJECTOR]?.platform().getInjector(this.type);
      this._injector = Injector.create(this.def.class.providers, tyInj, Scopes.static);
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