import { Injectable } from '@tsdi/ioc';
import { Endpoint, EndpointContext, Interceptor } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';
import { LISTEN_OPTS } from '@tsdi/platform-server';
import { Observable } from 'rxjs';
import { HttpClientOpts } from './option';

const abstUrlExp = /^http(s)?:/;

@Injectable({ static: true })
export class HttpPathInterceptor implements Interceptor<HttpRequest, HttpEvent> {

    constructor() { }

    intercept(req: HttpRequest<any>, next: Endpoint<HttpRequest<any>, HttpEvent<any>>, context: EndpointContext): Observable<HttpEvent<any>> {
        let url = req.url.trim();
        if (!abstUrlExp.test(url)) {
            const option = context.target.getOptions() as HttpClientOpts;
            if (option.authority) {
                url = new URL(url, option.authority).toString();
            } else {
                const { host, port, path, withCredentials } = context.get(LISTEN_OPTS);
                const protocol = (req.withCredentials || withCredentials) ? 'https' : 'http';
                const urlPrefix = `${protocol}://${host ?? 'localhost'}:${port ?? 3000}${path ?? ''}`;
                const baseUrl = new URL(urlPrefix);
                url = new URL(url, baseUrl).toString();
            }
            req = req.clone({ url })
        }
        return next.handle(req, context);
    }
}
