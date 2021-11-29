import { Abstract, Resolver, Type } from '@tsdi/ioc';
import { ApplicationContext } from './context';
import { ScanSet } from './scan.set';

/**
 * configure services for application.
 */
export interface StartupService {
    /**
     * config service of application.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {void} startup service token
     */
    configureService(ctx: ApplicationContext): void | Promise<void>;
}


@Abstract()
export abstract class ServiceSet implements ScanSet<StartupService> {
   /**
     * the service count.
     */
    abstract get count(): number;
    
    abstract getAll(): Resolver<StartupService>[];
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
    abstract add(resolver: Resolver<StartupService>, order?: number): void;
    /**
     * remove service resolver.
     * @param resolver 
     */
    abstract remove(resolver: Resolver<StartupService>): void;
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

