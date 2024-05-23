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
    readonly group?: string;
    /**
     * subfix of group.
     */
    readonly subfix?: string;

    readonly encodes?: ConfigableHandlerOptions;
    readonly decodes?: ConfigableHandlerOptions;

    

    comolete?(data: any): boolean;
}
