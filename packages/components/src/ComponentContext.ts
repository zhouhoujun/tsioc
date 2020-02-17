import { DecoratorProvider, tokenId } from '@tsdi/ioc';
import { BuildContext, IBuildOption, CTX_ELEMENT_NAME, IBuildContext } from '@tsdi/boot';
import { CTX_COMPONENT_DECTOR, CTX_COMPONENT, CTX_COMPONENT_REF, CTX_TEMPLATE_REF, CTX_ELEMENT_REF, IComponentRef, ITemplateRef, CTX_TEMPLATE_SCOPE } from './ComponentRef';
import { IComponentMetadata } from './decorators/IComponentMetadata';
import { IComponentReflect } from './IComponentReflect';
import { ComponentProvider, CTX_COMPONENT_PROVIDER } from './ComponentProvider';

export interface IComponentOption extends IBuildOption {

    /**
     * build as attr or not.
     */
    attr?: boolean;

    /**
     * sub build or not.
     */
    sub?: boolean;
}


export interface IComponentContext<T extends IComponentOption = IComponentOption,
    TMeta extends IComponentMetadata = IComponentMetadata,
    TRefl extends IComponentReflect = IComponentReflect> extends IBuildContext<T, TMeta, TRefl> {
    readonly name: string;
    getResultRef(): IComponentRef | ITemplateRef;
    /**
     * component instance.
     */
    readonly component: any;

    readonly componentContext: IComponentContext;
    /**
     * template scope.
     */
    getScope<T>(): T;
    getScopes(): any[];
    readonly componentProvider: ComponentProvider;
    readonly componentDecorator: string;

}


export const CTX_COMPONENT_CONTEXT = tokenId<IComponentContext>('CTX_COMPONENT_CONTEXT');

export class ComponentContext<T extends IComponentOption = IComponentOption,
    TMeta extends IComponentMetadata = IComponentMetadata,
    TRefl extends IComponentReflect = IComponentReflect>
    extends BuildContext<T, TMeta, TRefl> implements IComponentContext<T, TMeta, TRefl> {

    get name() {
        return this.context.getValue(CTX_ELEMENT_NAME);
    }

    getResultRef() {
        return this.context.getFirstValue(CTX_COMPONENT_REF, CTX_TEMPLATE_REF, CTX_ELEMENT_REF) ?? this.value;
    }

    /**
     * component instance.
     *
     * @readonly
     * @type {*}
     * @memberof ComponentContext
     */
    get component(): any {
        return this.context.getValue(CTX_COMPONENT) ?? this.getComponent();
    }

    protected getComponent() {
        let comp = this.getParent()?.getContextValue(CTX_COMPONENT);
        comp && this.setValue(CTX_COMPONENT, comp);
        return comp;
    }

    get componentContext() {
        return this.context.getValue(CTX_COMPONENT_CONTEXT) ?? this.getComponentContext();
    }
    protected getComponentContext() {
        let comp = this.getParent()?.getContextValue(CTX_COMPONENT_CONTEXT);
        comp && this.setValue(CTX_COMPONENT_CONTEXT, comp);
        return comp;
    }

    /**
     * template scope.
     *
     * @readonly
     * @memberof ComponentContext
     */
    getScope<T>(): T {
        return this.context.getValue(CTX_TEMPLATE_SCOPE) ?? this.getRouteScope();
    }

    protected getRouteScope() {
        let scope = this.getParent()?.getContextValue(CTX_TEMPLATE_SCOPE);
        scope && this.setValue(CTX_TEMPLATE_SCOPE, scope);
        return scope;
    }

    getScopes() {
        let scopes = [];
        let ctx = this.componentContext;
        while (ctx && !ctx.destroyed) {
            let comp = ctx.getValue(CTX_COMPONENT);
            if (comp) {
                scopes.push(comp);
            }
            ctx = ctx.componentContext;
        }
        return scopes;
    }

    get componentProvider(): ComponentProvider {
        return this.context.getValue(CTX_COMPONENT_PROVIDER) ?? this.getComponentProvider();
    }

    protected getComponentProvider() {
        let dector = this.componentDecorator;
        let pdr = dector ? this.reflects.getActionInjector().getInstance(DecoratorProvider).resolve(dector, ComponentProvider) : null;
        pdr && this.setValue(CTX_COMPONENT_PROVIDER, pdr);
        return pdr;
    }


    get componentDecorator() {
        return this.context.getValue(CTX_COMPONENT_DECTOR) ?? this.getComponentDecorator();
    }

    protected getComponentDecorator() {
        let dector = this.getContextValue(CTX_COMPONENT_DECTOR);
        dector && this.setValue(CTX_COMPONENT_DECTOR, dector);
        return dector;
    }

}

