import { Abstract } from '@tsdi/ioc';
import { ComponentRef } from '../refs/component';
import { IComponentBootContext } from '../refs/inter';


/**
 * component renderer.
 */
@Abstract()
export abstract class ComponentRenderer {
    render(ctx: IComponentBootContext, componentRef: ComponentRef) {
        ctx.attachView(componentRef.hostView);
        ctx.tick();
        ctx.components.push(componentRef);
        // // Get the listeners lazily to prevent DI cycles.
        // const listeners =
        //     this._injector.get(APP_BOOTSTRAP_LISTENER, []).concat(this._bootstrapListeners);
        // listeners.forEach((listener) => listener(componentRef));
    }
}
