import { ConfigableHandlerOptions } from '@tsdi/core';
import { HybirdTransport, Transport } from '../protocols';


/**
 * Codings options.
 */
export interface CodingsOpts {
    /**
     * transport type.
     */
    readonly transport?: Transport | HybirdTransport;
    /**
     * microservice or not.
     */
    readonly microservice?: boolean;

    readonly client?: boolean;
    readonly encodes?: ConfigableHandlerOptions;
    readonly decodes?: ConfigableHandlerOptions;
    /**
     * packet delimiter flag
     */
    readonly delimiter?: string;

    /**
     * head delimiter flag
     */
    readonly headDelimiter?: string;

    /**
     * content count number length.
     */
    readonly countLen?: number;
    /**
     * id b
     */
    readonly idLen?: number;
    /**
     * packet max size limit.
     */
    readonly maxSize?: number;

    readonly encoding?: string;
}
