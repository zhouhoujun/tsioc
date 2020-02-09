import { DecoratorProvider } from '@tsdi/ioc';
import { BuildContext, IBuildOption, CTX_ELEMENT_NAME, IBuildContext } from '@tsdi/boot';
import { CTX_COMPONENT_DECTOR, CTX_COMPONENT, CTX_COMPONENT_REF, CTX_TEMPLATE_REF, CTX_ELEMENT_REF, IComponentRef, ITemplateRef, CTX_COMPONENT_PARENT, CTX_TEMPLATE_SCOPE } from './ComponentRef';
import { IComponentMetadata } from './decorators/IComponentMetadata';
import { IComponentReflect } from './IComponentReflect';
import { ComponentProvider, CTX_COMPONENT_PROVIDER } from './ComponentProvider';

export interface IComponentOption extends IBuildOption {
    /**
     * template scope.
     */
    scope?: any;
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
    /**
     * template scope.
     */
    readonly scope: any;
    readonly $parent: IComponentContext;
    readonly componentProvider: ComponentProvider;
    readonly componentDecorator: string;

}

export class ComponentContext<T extends IComponentOption = IComponentOption,
    TMeta extends IComponentMetadata = IComponentMetadata,
    TRefl extends IComponentReflect = IComponentReflect>
    extends BuildContext<T, TMeta, TRefl> implements IComponentContext<T, TMeta, TRefl> {

    get name() {
        return this.getValue(CTX_ELEMENT_NAME);
    }

    getResultRef() {
        return this.getValue(CTX_COMPONENT_REF) ?? this.getValue(CTX_TEMPLATE_REF) ?? this.getValue(CTX_ELEMENT_REF) ?? this.value;
    }

    /**
     * component instance.
     *
     * @readonly
     * @type {*}
     * @memberof ComponentContext
     */
    get component(): any {
        if (!this.hasValue(CTX_COMPONENT)) {
            let comp = this.getContextValue(CTX_COMPONENT);
            comp && this.setValue(CTX_COMPONENT, comp);
        }
        return this.getValue(CTX_COMPONENT);
    }

    /**
     * template scope.
     *
     * @readonly
     * @memberof ComponentContext
     */
    get scope() {
        return this.getValue(CTX_TEMPLATE_SCOPE);
    }

    get $parent(): IComponentContext {
        return this.getContextValue(CTX_COMPONENT_PARENT);
    }

    getScopes() {
        let scopes = [];
        let ctx = this as IComponentContext;
        while (ctx) {
            let comp = ctx.getValue(CTX_COMPONENT);
            if (comp && scopes.indexOf(comp) < 0) {
                scopes.push(comp);
            }
            ctx = ctx.$parent;
        }
        return scopes;
    }

    get componentProvider(): ComponentProvider {
        if (!this.hasValue(CTX_COMPONENT_PROVIDER) && this.componentDecorator) {
            let pdr = this.reflects.getActionInjector().getInstance(DecoratorProvider).resolve(this.componentDecorator, ComponentProvider);
            pdr && this.setValue(CTX_COMPONENT_PROVIDER, pdr);
        }
        return this.getValue(CTX_COMPONENT_PROVIDER);
    }

    get componentDecorator() {
        if (!this.hasValue(CTX_COMPONENT_DECTOR)) {
            let dector = this.getContextValue(CTX_COMPONENT_DECTOR);
            dector && this.setValue(CTX_COMPONENT_DECTOR, dector);
        }
        return this.getValue(CTX_COMPONENT_DECTOR);
    }


    setOptions(options: T) {
        if (!options) {
            return this;
        }
        if (options.scope) {
            this.setValue(CTX_TEMPLATE_SCOPE, options.scope)
        }
        return super.setOptions(options);
    }
}

