import { ModuleType, ProvdierOf, Provider } from '@tsdi/ioc';
import { InvocationHandlerOptions } from '@tsdi/core';
import { Transport } from '@tsdi/common';
import { Server } from './Server';


/**
 * heybird options.
 */
export interface HeybirdOpts {
    /**
    * heybird or not.
    */
    heybird?: boolean | Transport.HTTP | Transport.gRPC | Transport.TCP | Transport.CoAP;
}


/**
 *  basic service options.
 */
export interface BasicServiceOpts {
    /**
     * service transport.
     */
    transport: Transport;
    /**
     * imports modules
     */
    imports?: ModuleType[];
    /**
     * auto bootstrap or not. default true.
     */
    bootstrap?: boolean;
    /**
     * server provdier.
     */
    server?: ProvdierOf<Server>;
    /**
     * start.
     */
    start?: InvocationHandlerOptions;
    /**
     * custom provider with module.
     */
    providers?: Provider[];
}
