import { Type } from '@tsdi/ioc';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { HybirdTransport, Transport } from '@tsdi/common';

export interface EncodingsOptions extends ConfigableHandlerOptions {
    end?: Type;
    complete? (data: any): boolean;
    defaults?: Array<[Type|string, Type|string]>
}

export interface DecodingsOptions extends ConfigableHandlerOptions {
    end?: Type;
    complete? (data: any): boolean;
    defaults?: Array<[Type|string, Type|string]>
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
}
