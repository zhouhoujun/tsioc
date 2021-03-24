import { Abstract } from '@tsdi/ioc';
import { ApplicationRef } from '../refs/app';
import { ComponentRef } from '../refs/component';


/**
 * component renderer.
 */
@Abstract()
export abstract class ComponentRenderer {
    render(appRef: ApplicationRef, componentRef: ComponentRef) {
        appRef.attachView(componentRef.hostView);
        appRef.tick();
        appRef.components.push(componentRef);
        // // Get the listeners lazily to prevent DI cycles.
        // const listeners =
        //     this._injector.get(APP_BOOTSTRAP_LISTENER, []).concat(this._bootstrapListeners);
        // listeners.forEach((listener) => listener(componentRef));
    }
}
