import { Injector, Type, Scopes } from '@tsdi/ioc';
import { ChangeDetectorRef } from '../chage/detector';
import { ComponentRef } from '../refs/component';
import { ElementRef } from '../refs/element';
import { INJECTOR, LView, TVIEW } from '../interfaces/view';
import { PropertyAliasValue, TContainerNode, TElementContainerNode, TElementNode } from '../interfaces/node';
import { RootViewRef, ViewRefImpl } from './view_ref';
import { ComponentDef } from '../type';
import { NodeInjector } from './injector';
import { stringifyForError } from '../util/stringify';

declare let devMode: any;

/**
 * component ref.
 */
export class ComponentRefImpl<T> extends ComponentRef<T> {

  private _type: Type<T>;

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

  override setInput(name: string, value: unknown): void {
    const inputData = this._tNode.inputs;
    let dataValue: PropertyAliasValue | undefined;
    if (inputData !== null && (dataValue = inputData[name])) {
      const lView = this._rootLView;
      setInputsForProperty(lView[TVIEW], lView, dataValue, name, value);
      markDirtyIfOnPush(lView, this._tNode.index);
    } else {
      if (devMode) {
        const cmpNameForError = stringifyForError(this.type);
        let message =
          `Can't set value of the '${name}' input on the '${cmpNameForError}' component. `;
        message += `Make sure that the '${name}' property is annotated with @Input() or a mapped @Input('${name}') exists.`;
        reportUnknownPropertyError(message);
      }
    }
  }

  override get injector(): Injector {
    return new NodeInjector(this._tNode, this._rootLView);
  }

  override destroy(): void {
    this.hostView.destroy();
  }

  override onDestroy(callback: () => void): void {
    this.hostView.onDestroy(callback);
  }
}

