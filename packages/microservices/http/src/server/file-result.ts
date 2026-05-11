import { IReadable } from '@tsdi/common';
import { Header } from '@tsdi/common';

export interface HttpFileResultOptions {
    filename?: string;
    contentType?: string;
    disposition?: 'inline' | 'attachment';
    headers?: Record<string, Header>;
    statusCode?: number;
}

export class HttpFileResult {
    constructor(
        readonly value: string | Buffer | IReadable,
        readonly options: HttpFileResultOptions = {}
    ) { }
}
