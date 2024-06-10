import { Type } from '@tsdi/ioc';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { HybirdTransport, Transport } from '@tsdi/common';

export interface EncodingsOptions extends ConfigableHandlerOptions {
    end?: Type;
    chain?: Type[];
}

export interface DecodingsOptions extends ConfigableHandlerOptions {
    end?: Type;
    chain?: Type[];
}

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

    readonly encodings?: EncodingsOptions;
    readonly decodings?: DecodingsOptions;


    encodeComplete?(data: any): boolean;
    decodeComplete?(data: any): boolean;
}
