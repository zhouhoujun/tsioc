import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { HTTP_LISTEN_OPTS } from '@tsdi/common';
import { HttpEvent, HttpRequest } from '@tsdi/common/http';
import { Observable } from 'rxjs';
import { HTTP_CLIENT_OPTS } from './option';

const abstUrlExp = /^http(s)?:/;

@Injectable({ static: true })
export class HttpPathInterceptor implements Interceptor<HttpRequest, HttpEvent> {

    constructor() { }

    intercept(req: HttpRequest<any>, next: Handler<HttpRequest<any>, HttpEvent<any>>): Observable<HttpEvent<any>> {
        let url = req.url.trim();
        if (!abstUrlExp.test(url)) {
            const context = req.context;
            const option = context.get(HTTP_CLIENT_OPTS);
            if (option.authority) {
                url = new URL(url, option.authority).toString();
            } else {
                const { host, port, path, withCredentials } = context.get(HTTP_LISTEN_OPTS);
                const protocol = (req.withCredentials || withCredentials) ? 'https' : 'http';
                const urlPrefix = `${protocol}://${host ?? 'localhost'}:${port ?? 3000}${path ?? ''}`;
                const baseUrl = new URL(urlPrefix);
                url = new URL(url, baseUrl).toString();
            }
            req = req.clone({ url })
        }
        return next.handle(req);
    }
}
