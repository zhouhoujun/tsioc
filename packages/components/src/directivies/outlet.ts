import { IInjector, OnDestroy, Type } from '@tsdi/ioc';
import { ModuleRef } from '@tsdi/boot';
import { Directive, Input } from '../decorators';
import { Change, Changes, OnChanges } from '../lifecycle';
import { ComponentRef } from '../refs/component';
import { ViewContainerRef } from '../refs/container';
import { ModuleFactory } from '../refs/module';
import { TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';

/**
 * @ngModule CommonModule
 *
 * @description
 *
 * Inserts an embedded view from a prepared `TemplateRef`.
 *
 * You can attach a context object to the `EmbeddedViewRef` by setting `[templateOutletContext]`.
 * `[templateOutletContext]` should be an object, the object's keys will be available for binding
 * by the local template `let` declarations.
 *
 * @usageNotes
 * ```
 * <v-container *templateOutlet="templateRefExp; context: contextExp"></v-container>
 * ```
 *
 * Using the key `$implicit` in the context object will set its value as default.
 *
 *
 * @publicApi
 */
@Directive({selector: '[templateOutlet]'})
export class DirTemplateOutlet implements OnChanges {
  private _viewRef: EmbeddedViewRef<any>|null = null;

  /**
   * A context object to attach to the {@link EmbeddedViewRef}. This should be an
   * object, the object's keys will be available for binding by the local template `let`
   * declarations.
   * Using the key `$implicit` in the context object will set its value as default.
   */
  @Input() public templateOutletContext: Object|null = null;

  /**
   * A string defining the template reference and optionally the context object for the template.
   */
  @Input() public templateOutlet: TemplateRef<any>|null = null;

  constructor(private _viewContainerRef: ViewContainerRef) {}

  onChanges(changes: Changes) {
    const recreateView = this._shouldRecreateView(changes);

    if (recreateView) {
      const viewContainerRef = this._viewContainerRef;

      if (this._viewRef) {
        viewContainerRef.remove(viewContainerRef.indexOf(this._viewRef));
      }

      this._viewRef = this.templateOutlet ?
          viewContainerRef.createEmbeddedView(this.templateOutlet, this.templateOutletContext) :
          null;
    } else if (this._viewRef && this.templateOutletContext) {
      this._updateExistingContext(this.templateOutletContext);
    }
  }

  /**
   * We need to re-create existing embedded view if:
   * - templateRef has changed
   * - context has changes
   *
   * We mark context object as changed when the corresponding object
   * shape changes (new properties are added or existing properties are removed).
   * In other words we consider context with the same properties as "the same" even
   * if object reference changes (see https://github.com/angular/angular/issues/13407).
   */
  private _shouldRecreateView(changes: Changes): boolean {
    const ctxChange = changes['templateOutletContext'];
    return !!changes['templateOutlet'] || (ctxChange && this._hasContextShapeChanged(ctxChange));
  }

  private _hasContextShapeChanged(ctxChange: Change): boolean {
    const prevCtxKeys = Object.keys(ctxChange.previousValue || {});
    const currCtxKeys = Object.keys(ctxChange.currentValue || {});

    if (prevCtxKeys.length === currCtxKeys.length) {
      for (let propName of currCtxKeys) {
        if (prevCtxKeys.indexOf(propName) === -1) {
          return true;
        }
      }
      return false;
    }
    return true;
  }

  private _updateExistingContext(ctx: Object): void {
    for (let propName of Object.keys(ctx)) {
      (<any>this._viewRef!.context)[propName] = (<any>this.templateOutletContext)[propName];
    }
  }
}



/**
 * Instantiates a single {@link Component} type and inserts its Host View into current View.
 * `DirComponentOutlet` provides a declarative approach for dynamic component creation.
 *
 * `DirComponentOutlet` requires a component type, if a falsy value is set the view will clear and
 * any existing component will get destroyed.
 *
 * @usageNotes
 *
 * ### Fine tune control
 *
 * You can control the component creation process by using the following optional attributes:
 *
 * * `componentOutletInjector`: Optional custom {@link Injector} that will be used as parent for
 * the Component. Defaults to the injector of the current view container.
 *
 * * `componentOutletContent`: Optional list of projectable nodes to insert into the content
 * section of the component, if exists.
 *
 * * `componentOutletModuleFactory`: Optional module factory to allow dynamically loading other
 * module, then load a component from that module.
 *
 * ### Syntax
 *
 * Simple
 * ```
 * <v-container *componentOutlet="componentTypeExpression"></v-container>
 * ```
 *
 * Customized injector/content
 * ```
 * <v-container *componentOutlet="componentTypeExpression;
 *                                   injector: injectorExpression;
 *                                   content: contentNodesExpression;">
 * </v-container>
 * ```
 *
 * Customized moduleFactory
 * ```
 * <v-container *componentOutlet="componentTypeExpression;
 *                                   moduleFactory: moduleFactory;">
 * </v-container>
 * ```
 *
 */
@Directive({selector: '[componentOutlet]'})
export class DirComponentOutlet implements OnChanges, OnDestroy {
  @Input() componentOutlet: Type<any>;
  @Input() componentOutletInjector: IInjector;
  @Input() componentOutletContent: any[][];
  @Input() componentOutletModuleFactory: ModuleFactory<any>;

  private _componentRef: ComponentRef<any>|null = null;
  private _moduleRef: ModuleRef<any>|null = null;

  constructor(private _viewContainerRef: ViewContainerRef) {}

  onChanges(changes: Changes) {
    this._viewContainerRef.clear();
    this._componentRef = null;

    if (this.componentOutlet) {
      const injector = this.componentOutletInjector || this._viewContainerRef.injector;

      if (changes['componentOutletModuleFactory']) {
        if (this._moduleRef) this._moduleRef.destroy();

        if (this.componentOutletModuleFactory) {
          this._moduleRef = this.componentOutletModuleFactory.create(injector);
        } else {
          this._moduleRef = null;
        }
      }

      this._componentRef = this._viewContainerRef.createComponent(
        this.componentOutlet, this._viewContainerRef.length, injector,
          this.componentOutletContent);
    }
  }

  onDestroy() {
    if (this._moduleRef) this._moduleRef.destroy();
  }
}
