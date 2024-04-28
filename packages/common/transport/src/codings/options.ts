import { ConfigableHandlerOptions } from '@tsdi/core';
import { HybirdTransport, Transport } from '../protocols';



export interface CodingsOpts {
    transport?: Transport | HybirdTransport;
    microservice?: boolean;
    client?: boolean;
    encodes?: ConfigableHandlerOptions;
    decodes?: ConfigableHandlerOptions;
    /**
     * packet delimiter flag
     */
    delimiter?: string;

    /**
     * head delimiter flag
     */
    headDelimiter?: string;

    /**
     * content count number length.
     */
    countLen?: number;
    /**
     * id b
     */
    idLen?: number;
    /**
     * packet max size limit.
     */
    maxSize?: number;
}
