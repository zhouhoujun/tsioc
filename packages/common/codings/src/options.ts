import { HybirdTransport, Transport } from '@tsdi/common';
import { ConfigableHandlerOptions } from '@tsdi/core';


/**
 * Codings options.
 */
export interface CodingsOpts {
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

    readonly encodings?: ConfigableHandlerOptions;
    readonly decodings?: ConfigableHandlerOptions;

    encodeComplete?(data: any): boolean;
    decodeComplete?(data: any): boolean;
}
