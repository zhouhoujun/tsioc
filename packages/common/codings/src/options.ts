import { HybirdTransport, Transport } from '@tsdi/common';
import { ConfigableHandlerOptions } from '@tsdi/core';


/**
 * Codings options.
 */
export interface CodingsOpts extends ConfigableHandlerOptions {
    /**
     * the codings action name.
     */
    readonly name?: string;
    /**
     * group of codings.
     */
    readonly group?: Transport | HybirdTransport | 'runner' | 'events';
    /**
     * subfix of group.
     */
    readonly subfix?: string;


    comolete?(data: any): boolean;
}
