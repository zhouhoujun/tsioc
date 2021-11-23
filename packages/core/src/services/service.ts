import { Abstract, Destroy, Resolver } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';

/**
 * configure services for application.
 */
export interface Service extends Destroy {
    /**
     * config service of application.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {void} startup service token
     */
    configureService(ctx: ApplicationContext): void | Promise<void>;
}



@Abstract()
export abstract class ServiceSet implements Destroy {
    /**
     * the service count.
     */
    abstract get count(): number;

    abstract getAll(): Resolver<Service>[];
    /**
     * clear service resolver.
     */
    abstract clear(): void;
    /**
     * configuration all service.
     */
    abstract configuration(ctx: ApplicationContext): Promise<void>;
    /**
     * destory this.
     */
    abstract destroy(): void
}

