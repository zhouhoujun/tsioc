import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, UrlRequestOptions, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { defer, Observable, switchMap } from 'rxjs';
import { HTTP_CLIENT_OPTIONS, HttpClientOptions } from './options';
import { HttpRequest } from './request';

@Injectable()
export class HttpClient extends AbstractClient<HttpRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    constructor(
        readonly handler: ClientHandler<HttpRequest<any>, ResponseEvent<any>>,
        @Inject(HTTP_CLIENT_OPTIONS, { nullable: true }) private options: HttpClientOptions
    ) { super(); }

    protected connect(): Observable<any> {
        return defer(async () => ({ connected: true }));
    }

    protected initContext(context: Context, req: HttpRequest<any>): void {
        context.set(HttpClient, this);
        context.set(HttpRequest, req);
    }

    protected buildRequest(first: HttpRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): HttpRequest<any> {
        if (first instanceof HttpRequest) return first;
        const defaultMethod = this.options.microservice ? undefined : 'GET';
        if (isString(first)) return new HttpRequest(first, null, options, defaultMethod);
        else return new HttpRequest(this.handler.injector.get(PatternFormatter).format(first), first, options, defaultMethod);
    }

    protected override request(first: Pattern | HttpRequest<any>, options: UrlRequestOptions = {} as any): Observable<any> {
        return this.connect().pipe(switchMap(() => super.request(first, options)));
    }

    protected async onShutdown(): Promise<void> {}

    protected isValid(_connection: any): boolean { return true; }
}
