import { TransportContext } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Stats } from 'fs';


export interface SendOption {
    root: string | string[];
    index?: string;
    maxAge?: number;
    immutable?: boolean;
    hidden?: boolean;
    format?: boolean;
    extensions?: string[] | false;
    brotli?: boolean;
    gzip?: boolean;
    setHeaders?: (ctx: TransportContext, path: string, stats: Stats) => void;
}

/**
 * send adapter.
 */
@Abstract()
export abstract class SendAdapter {
    abstract send(ctx: TransportContext, options: SendOption): Promise<string>;
}
