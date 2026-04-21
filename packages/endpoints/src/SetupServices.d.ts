import { Provider, Invocation, AbstractType } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { Server } from './Server';
export interface RegisterService {
    service: AbstractType | Invocation;
    bootstrap?: boolean;
    microservice?: boolean;
    providers?: Provider[];
}
export declare const REGISTER_SERVICES: import("@tsdi/ioc").InjectToken<RegisterService[]>;
/**
 * setup register services in root.
 */
export declare class SetupServices {
    private context;
    private services;
    private unboots;
    protected setup(context: ApplicationContext): Promise<any>;
    getServices(): Invocation<Server>[];
    /**
     * run services, configed not auto bootstrap.
     * @returns
     */
    run(): Promise<void>;
}
