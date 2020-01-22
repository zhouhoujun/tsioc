import { DecoratorProvider } from '@tsdi/ioc';
import { BuildContext, IBuildOption, CTX_ELEMENT_NAME, IBuildContext } from '@tsdi/boot';
import { CTX_COMPONENT_DECTOR, CTX_COMPONENT, CTX_COMPONENT_REF, CTX_TEMPLATE_REF, CTX_ELEMENT_REF, IComponentRef, ITemplateRef } from '../ComponentRef';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { IComponentReflect } from '../IComponentReflect';
import { ComponentProvider, CTX_COMPONENT_PROVIDER } from '../ComponentProvider';

export interface IComponentContext<T extends IBuildOption = IBuildOption,
    TMeta extends IComponentMetadata = IComponentMetadata,
    TRefl extends IComponentReflect = IComponentReflect> extends IBuildContext<T, TMeta, TRefl> {
    readonly name: string;
    getResultRef(): IComponentRef | ITemplateRef;
    readonly scope: any;
    readonly componentProvider: ComponentProvider;
    readonly componentDecorator: string;

}

export class ComponentContext<T extends IBuildOption = IBuildOption,
    TMeta extends IComponentMetadata = IComponentMetadata,
    TRefl extends IComponentReflect = IComponentReflect>
    extends BuildContext<T, TMeta, TRefl> implements IComponentContext<T, TMeta, TRefl> {

    get name() {
        return this.getValue(CTX_ELEMENT_NAME);
    }

    getResultRef() {
        return this.getValue(CTX_COMPONENT_REF) ?? this.getValue(CTX_TEMPLATE_REF) ?? this.getValue(CTX_ELEMENT_REF) ?? this.value;
    }

    get scope(): any {
        if (!this.hasValue(CTX_COMPONENT)) {
            let scope = this.resolve(CTX_COMPONENT)
            scope && this.setValue(CTX_COMPONENT, scope);
        }
        return this.getValue(CTX_COMPONENT);
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
            let dector = this.resolve(CTX_COMPONENT_DECTOR);
            dector && this.setValue(CTX_COMPONENT_DECTOR, dector);
        }
        return this.getValue(CTX_COMPONENT_DECTOR);
    }
}

