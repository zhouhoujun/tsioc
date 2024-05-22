import { ConfigableHandlerOptions } from '@tsdi/core';
import { HybirdTransport, Transport } from '@tsdi/common';


/**
 * Codings options.
 */
export interface CodingsOpts {
    readonly encodes?: ConfigableHandlerOptions;
    readonly decodes?: ConfigableHandlerOptions;
    /**
     * transport type.
     */
    readonly transport?: Transport | HybirdTransport;
    /**
     * microservice or not.
     */
    readonly microservice?: boolean;

    readonly client?: boolean;
    

    comolete?(data: any): boolean;
}
