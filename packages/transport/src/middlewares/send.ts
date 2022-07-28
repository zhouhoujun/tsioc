import { AssetContext } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Stats } from 'fs';


export interface SendOptions {
    root: string | string[];
    index?: string;
    maxAge?: number;
    immutable?: boolean;
    hidden?: boolean;
    format?: boolean;
    extensions?: string[] | false;
    brotli?: boolean;
    gzip?: boolean;
    setHeaders?: (ctx: AssetContext, path: string, stats: Stats) => void;
}

/**
 * Content send adapter.
 */
@Abstract()
export abstract class ContentSendAdapter {
    abstract send(ctx: AssetContext, options: SendOptions): Promise<string>;
}
