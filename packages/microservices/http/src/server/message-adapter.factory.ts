import { Injectable } from '@tsdi/ioc';
import { AcceptsPriority, MessageAdapterFactory, MessageAdapterFactoryOptions, MimeAdapter } from '@tsdi/common';
import { HttpRequestMessage, HttpServResponse } from './http-context';
import { HttpMessageAdapter } from './message-adapter';

@Injectable()
export class HttpMessageAdapterFactory extends MessageAdapterFactory<HttpRequestMessage, HttpServResponse, HttpMessageAdapter> {
    constructor(
        private acceptsPriority?: AcceptsPriority,
        private mimeAdapter?: MimeAdapter
    ) {
        super();
    }

    create(options: MessageAdapterFactoryOptions<HttpRequestMessage, HttpServResponse>): HttpMessageAdapter {
        return new HttpMessageAdapter(options.request, options.response, this.acceptsPriority, this.mimeAdapter);
    }
}
