import { ConfigableHandlerOptions } from '@tsdi/core';
import { HybirdTransport, Transport } from '@tsdi/common';
import { ProvdierOf } from '@tsdi/ioc';
import { CodingsAapter } from './CodingsAapter';

/**
 * codings option.
 */
export interface CodingsOptions {
    /**
     * the codings action name.
     */
    name?: string;
    /**
     * group of codings.
     */
    group?: Transport | HybirdTransport | 'runner' | 'events';
    /**
     * subfix of group.
     */
    subfix?: string;

    // end?: Type;

    // complete?(data: any): boolean;

    // defaults?: Array<[Type | string, Type | string]>
}


export interface CodingsHandlerOptions extends CodingsOptions {
    configable?: ConfigableHandlerOptions;
    adapter?: ProvdierOf<CodingsAapter>;
}
