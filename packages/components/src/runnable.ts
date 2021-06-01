import { Injectable } from '@tsdi/ioc';
import { BootContext, Service } from '@tsdi/boot';
import { ComponentRef } from './refs/component';
import { ApplicationRef } from './refs/app';

/**
 * component runnable.  for application boot.
 */
@Injectable()
export class ComponentRunnable extends Service {

    componentRef: ComponentRef;

    async configureService(ctx: BootContext): Promise<void> {
        const compRef = this.componentRef = ctx.boot as ComponentRef;
        if (!(ctx.boot instanceof ComponentRef)) {
            throw new Error('bootstrap type is not a component.');
        }
        const appRef = ctx.injector.get(ApplicationRef);
        appRef.bootstrap(compRef);
    }
}
