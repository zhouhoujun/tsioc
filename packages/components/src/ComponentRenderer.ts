import { Abstract } from '@tsdi/ioc';
import { BootContext, Renderer } from '@tsdi/boot';
import { ComponentRef } from './ComponentRef';

@Abstract()
export abstract class ComponentRenderer<T = any, TCtx extends BootContext = BootContext> extends Renderer<T, TCtx> {

    private _compRef: ComponentRef<T>;
    get componentRef(): ComponentRef<T> {
        return this._compRef;
    }

    async render(host?: any): Promise<void> {
        this._compRef = new ComponentRef(this.getBootType(), this.getBoot(), host);
        await super.render(host);
    }

}
