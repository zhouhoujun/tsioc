import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, LOCALHOST, RequestInitOpts, UrlRequestOptions, ResponseEvent, PatternFormatter, defaultFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { defer, Observable } from 'rxjs';
import { COAP_CLIENT_OPTIONS, CoapClientOptions } from './options';
import { CoapRequest } from './request';

@Injectable()
export class CoapClient extends AbstractClient<CoapRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    constructor(
        readonly handler: ClientHandler<CoapRequest<any>, ResponseEvent<any>>,
        @Inject(COAP_CLIENT_OPTIONS, { nullable: true }) private options: CoapClientOptions
    ) {
        super();
        if (!options.port && !options.url) {
            options.port = 5683;
            options.host = LOCALHOST;
        }
    }

    protected connect(): Observable<any> {
        return defer(async () => {
            return { connected: true };
        });
    }

    protected initContext(context: Context, req: CoapRequest<any>): void {
        context.set(CoapClient, this);
        context.set(CoapRequest, req);
    }

    protected buildRequest(first: CoapRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): CoapRequest<any> {
        if (first instanceof CoapRequest) {
            return first;
        }
        const defaultMethod = this.options.microservice ? undefined : 'GET';
        if (isString(first)) {
            const url = this.options.compatibility && first.includes('.') ? first.replace(/\./g, '/') : first;
            return new CoapRequest(url, first, options, defaultMethod);
        } else {
            const formatter = this.handler.injector.get(PatternFormatter, defaultFormatter);
            return new CoapRequest(formatter.format(first), first, options, defaultMethod);
        }
    }

    protected async onShutdown(): Promise<void> {
        // CoAP client doesn't hold persistent connections
    }

    protected isValid(_connection: any): boolean {
        return true;
    }
}
