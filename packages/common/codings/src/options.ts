import { ConfigableHandlerOptions } from '@tsdi/core';
import { HybirdProtocols, Protocols } from '@tsdi/common';
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
    group?: Protocols | HybirdProtocols | 'runner' | 'events';
    /**
     * subfix of group.
     */
    subfix?: string;

}


export interface CodingsHandlerOptions extends CodingsOptions {
    configable?: ConfigableHandlerOptions;
    adapter?: ProvdierOf<CodingsAapter>;
}
