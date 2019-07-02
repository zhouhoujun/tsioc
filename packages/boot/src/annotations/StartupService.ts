import { Inject, Abstract } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';
import { BootContext } from '../BootContext';

/**
 * core service confige startup.
 *
 * @export
 * @abstract
 * @class ServiceRegister
 * @template T
 */
@Abstract()
export abstract class StartupService<T extends BootContext = BootContext> {
    constructor() {
    }

    @Inject(ContainerToken)
    protected container: IContainer;

    /**
     * config core global service.
     *
     * @abstract
     * @param {RunnableConfigure} config
     * @param {T} [ctx]
     * @returns {Promise<void>}
     * @memberof ConfigureRegister
     */
    abstract configureService(ctx: T): Promise<void>;
}
