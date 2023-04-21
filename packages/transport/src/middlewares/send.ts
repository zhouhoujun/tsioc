import { AssetContext } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';


export interface SendOptions<TStats = any> {
    root: string | string[];
    index?: string;
    maxAge?: number;
    immutable?: boolean;
    hidden?: boolean;
    format?: boolean;
    extensions?: string[] | false;
    brotli?: boolean;
    gzip?: boolean;
    setHeaders?: (ctx: AssetContext, path: string, stats: TStats) => void;
}

/**
 * Content send adapter.
 */
@Abstract()
export abstract class ContentSendAdapter<TStats = any> {
    abstract send(ctx: AssetContext, options: SendOptions<TStats>): Promise<string>;
}
