import { DecoratorProvider } from '@tsdi/ioc';
import { BuildContext, IBuildOption, AnnoationContext, CTX_ELEMENT_NAME } from '@tsdi/boot';
import { CTX_COMPONENT_DECTOR, CTX_COMPONENT, CTX_COMPONENT_REF, CTX_TEMPLATE_REF, CTX_ELEMENT_REF } from '../ComponentRef';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { IComponentReflect } from '../IComponentReflect';
import { ComponentProvider, CTX_COMPONENT_PROVIDER } from '../ComponentProvider';



export class ComponentContext<T extends IBuildOption = IBuildOption,
    TMeta extends IComponentMetadata = IComponentMetadata,
    TRefl extends IComponentReflect = IComponentReflect>
    extends BuildContext<T, TMeta, TRefl> {

    get name() {
        return this.getValue(CTX_ELEMENT_NAME);
    }

    getResultRef() {
        return this.getValue(CTX_COMPONENT_REF) ?? this.getValue(CTX_TEMPLATE_REF) ?? this.getValue(CTX_ELEMENT_REF) ?? this.value;
    }

    get scope(): any {
        if (!this.hasValue(CTX_COMPONENT)) {
            let ctx: AnnoationContext = this;
            while (ctx && !this.hasValue(CTX_COMPONENT)) {
                let scope = ctx.getValue(CTX_COMPONENT);
                scope && ctx.setValue(CTX_COMPONENT, scope);
                ctx = ctx.getParent();
            }
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
            let dector: string;
            if (this.type) {
                dector = this.decorator;
            } else {
                let ctx: AnnoationContext = this;
                while (ctx && !dector) {
                    dector = ctx.getValue(CTX_COMPONENT_DECTOR);
                    ctx = ctx.getParent();
                }
            }
            if (dector) {
                this.setValue(CTX_COMPONENT_DECTOR, dector);
            }
        }
        return this.getValue(CTX_COMPONENT_DECTOR);
    }


}

