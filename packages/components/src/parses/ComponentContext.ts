import { BuildContext, IBuildOption, AnnoationContext } from '@tsdi/boot';
import { CTX_COMPONENT_DECTOR, CTX_COMPONENT, CTX_COMPONENT_REF, CTX_TEMPLATE_REF, CTX_ELEMENT_REF } from '../ComponentRef';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { IComponentReflect } from '../IComponentReflect';
import { ComponentProvider } from '../ComponentProvider';
import { DecoratorProvider } from '@tsdi/ioc';


export class ComponentContext<T extends IBuildOption = IBuildOption,
    TMeta extends IComponentMetadata = IComponentMetadata,
    TRefl extends IComponentReflect = IComponentReflect>
    extends BuildContext<T, TMeta, TRefl> {


    getResultRef() {
        return this.getValue(CTX_COMPONENT_REF) ?? this.getValue(CTX_TEMPLATE_REF) ?? this.getValue(CTX_ELEMENT_REF) ?? this.value;
    }

    private _scope: any;
    get scope(): any {
        if (!this._scope) {
            let ctx: AnnoationContext = this;
            while (ctx && !this._scope) {
                this._scope = ctx.getValue(CTX_COMPONENT);
                ctx = ctx.getParent();
            }
        }
        return this._scope;
    }

    private _prvoider: ComponentProvider;
    get componentProvider(): ComponentProvider {
        if (!this._prvoider && this.componentDecorator) {
            this._prvoider = this.reflects.getActionInjector().getInstance(DecoratorProvider).resolve(this.componentDecorator, ComponentProvider);
        }
        return this._prvoider;
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
                this.set(CTX_COMPONENT_DECTOR, dector);
            }
        }
        return this.getValue(CTX_COMPONENT_DECTOR);
    }
}

