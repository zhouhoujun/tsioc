import { Abstract } from '@tsdi/ioc';
import { FileAdapter, FileStats, FindOptions, MessageAdapter } from './index';

export interface SendOptions extends FindOptions {
    method?: string;
    headers?: Record<string, any>;
    disposition?: 'inline' | 'attachment';
    statusCode?: number;
    contentType?: string;
    fields?: {
        cacheControl?: string;
        contentEncoding?: string;
        contentLength?: string;
        contentType?: string;
        disposition?: string;
        lastModified?: string;
        acceptRanges?: string;
        range?: string;
        contentRange?: string;
    };
    setHeaders?: (adapter: MessageAdapter, path: string, stats: any) => void;
}

@Abstract()
export abstract class ContentSendAdapter {
    abstract send(adapter: MessageAdapter, fileAdapter: FileAdapter, path: string, options?: SendOptions): Promise<FileStats<any> | null>;
}
