import { Injectable, lang } from '@tsdi/ioc';
import { Runnable } from '@tsdi/boot';
import { ComponentRef } from '../refs/component';
import { IComponentBootContext } from '../refs/view';
import { ComponentRenderer } from './renderer';

/**
 * component runnable.  for application boot.
 */
@Injectable()
export class ComponentRunnable extends Runnable {

    componentRef: ComponentRef;

    async configureService(ctx: IComponentBootContext): Promise<void> {
        const compRef = this.componentRef = ctx.boot as ComponentRef;
        if (!(ctx.boot instanceof ComponentRef)) {
            throw new Error('bootstrap type is not a component.');
        }
        ctx.componentTypes.push(compRef.componentType);
        compRef.onDestroy(() => {
            lang.remove(ctx.components, compRef);
        })
        const renderer = ctx.injector.getService({ token: ComponentRenderer, target: compRef.instance })
        renderer.render(ctx, compRef);
    }
}
