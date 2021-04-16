import { Injectable } from '@tsdi/ioc';
import { IBootContext, Runnable } from '@tsdi/boot';
import { ComponentRef } from './refs/component';
import { ApplicationRef } from './refs/app';

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
        const appRef = ctx.root.get(ApplicationRef);
        appRef.bootstrap(compRef);
    }
}
