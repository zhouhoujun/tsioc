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
    /**
     * get all service.
     */
    abstract getAll(): Resolver<StartupService>[];
    /**
     * has the client type or not.
     * @param type class type.
     */
     abstract has(type: Type<any>): boolean;
    /**
     * add service resolver.
     * @param resolver
     * @param order the order insert to.
     */
    abstract add(resolver: Resolver<StartupService>, order?: number): void;
    /**
     * remove service resolver.
     * @param resolver resolver instance.
     */
    abstract remove(resolver: Resolver<StartupService>): void;
    /**
     * clear service resolver.
     */
    abstract clear(): void;
    /**
     * destory this.
     */
    abstract onDestroy(): void
    /**
     * startup all service.
     */
    abstract startup(ctx: ApplicationContext): Promise<void>;
}

