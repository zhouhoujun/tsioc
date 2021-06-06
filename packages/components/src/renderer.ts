import { Abstract } from '@tsdi/ioc';
import { Service } from '@tsdi/boot';
import { ComponentRef } from './refs/component';

/**
 * component renderer.  for application boot.
 */
@Abstract()
export abstract class Renderer<T = any> extends Service<T> {

    abstract get componentRef(): ComponentRef<T>;

    abstract configureService(ctx: ComponentRef<T>): void;

    // async configureService(ctx: ComponentRef<T>): Promise<void> {
    //     const compRef = this.componentRef = ctx;
    //     if (!(compRef instanceof ComponentRef)) {
    //         throw new Error('bootstrap type is not a component.');
    //     }
    //     const appRef = ctx.injector.get(ApplicationRef);
    //     appRef.bootstrap(compRef);
    // }

    abstract render();
}
