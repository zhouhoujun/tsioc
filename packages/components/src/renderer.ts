import { Abstract } from '@tsdi/ioc';
import { ComponentRef } from './refs/component';

/**
 * component renderer.  for application boot.
 */
@Abstract()
export abstract class Renderer<T = any> {

    abstract get componentRef(): ComponentRef<T>;

    // async configureService(ctx: ComponentRef<T>): Promise<void> {
    //     const compRef = this.componentRef = ctx;
    //     if (!(compRef instanceof ComponentRef)) {
    //         throw new Error('bootstrap type is not a component.');
    //     }
    //     const appRef = ctx.injector.get(ApplicationRef);
    //     appRef.bootstrap(compRef);
    // }

    abstract render(): void;
}
