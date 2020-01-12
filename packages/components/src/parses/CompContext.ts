import { BuildContext, IBuildOption, AnnoationContext } from '@tsdi/boot';
import { CTX_COMPONENT_DECTOR, CTX_COMPONENT } from '../ComponentRef';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { IComponentReflect } from '../IComponentReflect';


export class CompContext<T extends IBuildOption = IBuildOption,
    TMeta extends IComponentMetadata = IComponentMetadata,
    TRefl extends IComponentReflect = IComponentReflect>
    extends BuildContext<T, TMeta, TRefl> {
    private _scope: any;
    get scope(): any {
        if (!this._scope) {
            let ctx: AnnoationContext = this;
            while (ctx && !this._scope) {
                this._scope = ctx.get(CTX_COMPONENT);
                ctx = ctx.getParent();
            }
        }
        return this._scope;
    }

    get componentDecorator() {
        if (!this.has(CTX_COMPONENT_DECTOR)) {
            let dector: string;
            if (this.type) {
                dector = this.decorator;
            } else {
                let ctx: AnnoationContext = this;
                while (ctx && !dector) {
                    dector = ctx.get(CTX_COMPONENT_DECTOR);
                    ctx = ctx.getParent();
                }
            }
            if (dector) {
                this.set(CTX_COMPONENT_DECTOR, dector);
            }
        }
        return this.get(CTX_COMPONENT_DECTOR);
    }
}

