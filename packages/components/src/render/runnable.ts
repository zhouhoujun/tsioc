import { Injectable, lang } from '@tsdi/ioc';
import { IBootContext, Runnable } from '@tsdi/boot';
import { ComponentRef } from '../refs/component';
import { ComponentRenderer } from './renderer';
import { ApplicationRef } from '../refs/app';

/**
 * component runnable.  for application boot.
 */
@Injectable()
export class ComponentRunnable extends Runnable {

    componentRef: ComponentRef;

    async configureService(ctx: IBootContext): Promise<void> {
        const compRef = this.componentRef = ctx.boot as ComponentRef;
        if (!(ctx.boot instanceof ComponentRef)) {
            throw new Error('bootstrap type is not a component.');
        }
        const injector = ctx.injector;
        const app = injector.get(ApplicationRef);
        app.componentTypes.push(compRef.componentType);
        compRef.onDestroy(() => {
            lang.remove(app.components, compRef);
        });

        const renderer = injector.getService({ token: ComponentRenderer, target: compRef.instance })
        renderer.render(app, compRef);
    }
}
