import { Abstract, Resolver, Type } from '@tsdi/ioc';
import { ApplicationContext, BootstrapOption } from './context';
import { ScanSet } from './scan.set';


export interface Runnable {
    run(): any;
}

/**
 * runnable
 */
@Abstract()
export abstract class Runner {
    /**
     * run this service.
     */
    abstract run(): any;
}


@Abstract()
export abstract class RunnableSet implements ScanSet<Runnable> {
   /**
     * the service count.
     */
    abstract get count(): number;
    
    abstract getAll(): Resolver<Runnable>[];
    /**
     * has the client type or not.
     * @param type 
     */
     abstract has(type: Type<any>): boolean;
    /**
     * add service resolver.
     * @param resolver
     * @param order 
     */
    abstract add(resolver: Resolver<Runnable>, order?: number): void;
    /**
     * remove service resolver.
     * @param resolver 
     */
    abstract remove(resolver: Resolver<Runnable>): void;
    /**
     * clear service resolver.
     */
    abstract clear(): void;
    /**
     * destory this.
     */
    abstract destroy(): void
    /**
     * startup all service.
     */
    abstract startup(ctx: ApplicationContext): Promise<void>;
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
    abstract create(option: BootstrapOption, context?: ApplicationContext): Runner;
}

/**
 * runnable factory resolver.
 */
@Abstract()
export abstract class RunnableFactoryResolver {
    abstract resolve<T>(type: Type<T>): RunnableFactory<T>;
}
