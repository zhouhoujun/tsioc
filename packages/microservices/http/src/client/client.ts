import { Injectable, isString, Context, Inject, promisify } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, UrlRequestOptions, Response, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { defer, Observable, switchMap } from 'rxjs';
import * as http2 from 'node:http2';
import { HTTP_CLIENT_OPTIONS, HttpClientOptions } from './options';
import { HttpRequest } from './request';

@Injectable()
export class HttpClient extends AbstractClient<HttpRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    private session?: http2.ClientHttp2Session;

    constructor(
        readonly handler: ClientHandler<HttpRequest<any>, ResponseEvent<any>>,
        @Inject(HTTP_CLIENT_OPTIONS, { nullable: true }) private options: HttpClientOptions
    ) { super(); }

    getSession(): http2.ClientHttp2Session | undefined {
        return this.session;
    }

    protected connect(): Observable<any> {
        if (!this.options.authority) {
            return defer(async () => ({ connected: true }));
        }
        return defer(async () => {
            if (this.session && this.isValid(this.session)) {
                return this.session;
            }

            if (this.session) {
                this.session.removeAllListeners();
                this.session.destroy();
                this.session = undefined;
            }

            return await new Promise<http2.ClientHttp2Session>((resolve, reject) => {
                const session = http2.connect(this.options.authority!, this.options.connectOpts);
                const cleanup = () => {
                    session.off('connect', onConnect);
                    session.off('error', onError);
                };
                const onConnect = () => {
                    cleanup();
                    this.session = session;
                    resolve(session);
                };
                const onError = (err: Error) => {
                    cleanup();
                    session.destroy();
                    reject(err);
                };
                session.once('connect', onConnect);
                session.once('error', onError);
            });
        });
    }

    protected initContext(context: Context, req: HttpRequest<any>): void {
        context.set(HttpClient, this);
        context.set(HttpRequest, req);
    }

    protected buildRequest(first: HttpRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): HttpRequest<any> {
        if (first instanceof HttpRequest) return first;
        const defaultMethod = this.options.microservice ? undefined : 'GET';
        if (isString(first)) return new HttpRequest(first, null, options, defaultMethod);
        return new HttpRequest(this.handler.injector.get(PatternFormatter).format(first), first, options, defaultMethod);
    }

    protected async onShutdown(): Promise<void> {
        if (!this.session) return;
        const session = this.session;
        this.session = undefined;
        if (session.closed || session.destroyed) return;
        try {
            const socket = (session as any).socket;
            if (socket && typeof socket.unref === 'function') {
                socket.unref();
            }
        } catch {
            // ignore socket unref errors during shutdown
        }
        try {
            await promisify(session.close, session)();
        } catch {
            // ignore close callback errors, destroy below as a finalizer
        }
        if (!session.closed && !session.destroyed) {
            session.destroy();
        }
    }

    protected isValid(connection: http2.ClientHttp2Session): boolean {
        return !connection.closed && !connection.destroyed;
    }

    get<T = any>(url: string, options: UrlRequestOptions & { observe: 'response'; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream'; params?: any }): Observable<Response<T>>;
    get<T = any>(url: string, options?: UrlRequestOptions & { observe?: 'body'; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream'; params?: any }): Observable<T>;
    get(url: string, options?: UrlRequestOptions & { observe?: string; responseType?: string; params?: any }): Observable<any> {
        return this.send(new HttpRequest(url, null, {
            ...options,
            method: 'GET'
        } as any));
    }

    post<T = any>(url: string, body: any, options: UrlRequestOptions & { observe: 'response'; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream'; params?: any }): Observable<Response<T>>;
    post<T = any>(url: string, body: any, options?: UrlRequestOptions & { observe?: 'body'; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream'; params?: any }): Observable<T>;
    post(url: string, body: any, options?: UrlRequestOptions & { observe?: string; responseType?: string; params?: any }): Observable<any> {
        return this.send(new HttpRequest(url, null, {
            ...options,
            body,
            method: 'POST'
        } as any));
    }

    put<T = any>(url: string, body: any, options: UrlRequestOptions & { observe: 'response'; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream'; params?: any }): Observable<Response<T>>;
    put<T = any>(url: string, body: any, options?: UrlRequestOptions & { observe?: 'body'; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream'; params?: any }): Observable<T>;
    put(url: string, body: any, options?: UrlRequestOptions & { observe?: string; responseType?: string; params?: any }): Observable<any> {
        return this.send(new HttpRequest(url, null, {
            ...options,
            body,
            method: 'PUT'
        } as any));
    }

    delete<T = any>(url: string, options: UrlRequestOptions & { observe: 'response'; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream'; params?: any }): Observable<Response<T>>;
    delete<T = any>(url: string, options?: UrlRequestOptions & { observe?: 'body'; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream'; params?: any }): Observable<T>;
    delete(url: string, options?: UrlRequestOptions & { observe?: string; responseType?: string; params?: any }): Observable<any> {
        return this.send(new HttpRequest(url, null, {
            ...options,
            method: 'DELETE'
        } as any));
    }
}
