import { Injectable } from '@tsdi/ioc';
import { Service } from '@tsdi/boot';
import { ComponentRef } from './refs/component';
import { ApplicationRef } from './refs/app';

/**
 * component runnable.  for application boot.
 */
@Injectable()
export class ComponentRunnable<T> extends Service<T> {

    componentRef: ComponentRef;

    async configureService(ctx: ComponentRef<T>): Promise<void> {
        const compRef = this.componentRef = ctx;
        if (!(compRef instanceof ComponentRef)) {
            throw new Error('bootstrap type is not a component.');
        }
        const appRef = ctx.injector.get(ApplicationRef);
        appRef.bootstrap(compRef);
    }
}
