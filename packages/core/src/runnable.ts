import { Abstract, Type } from '@tsdi/ioc';
import { ApplicationContext, BootstrapOption } from './context';

/**
 * runnable
 */
@Abstract()
export abstract class Runnable {
    /**
     * run this service.
     */
    abstract run(): any;
}

/**
 * boot factory.
 */
@Abstract()
export abstract class RunnableFactory<T> {
    /**
     * service type.
     */
    abstract get type(): Type<T>;
    /**
     * create boot context.
     * @param option 
     */
    abstract create(option: BootstrapOption, context?: ApplicationContext): Runnable;
}

/**
 * runnable factory resolver.
 */
@Abstract()
export abstract class RunnableFactoryResolver {
    abstract resolve<T>(type: Type<T>): RunnableFactory<T>;
}
