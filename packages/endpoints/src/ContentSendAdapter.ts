import { Abstract } from '@tsdi/ioc';
import { RequestContext } from './RequestContext';


export interface SendOptions<TStats = any> {
    root: string | string[];
    prefix?: string;
    baseUrl?: string | boolean;
    index?: string | boolean;
    maxAge?: number;
    immutable?: boolean;
    hidden?: boolean;
    format?: boolean;
    extensions?: string[] | false;
    brotli?: boolean;
    gzip?: boolean;
    setHeaders?: (ctx: RequestContext, path: string, stats: TStats) => void;
}


/**
 * Static Content options.
 */

export interface ContentOptions extends SendOptions {
    defer?: boolean;
}

/**
 * Content send adapter.
 */
@Abstract()
export abstract class ContentSendAdapter<TStats = any> {
    abstract send(ctx: RequestContext, options: SendOptions<TStats>): Promise<string>;
}
