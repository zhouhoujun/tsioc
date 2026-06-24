import { Inject, Injectable, Optional, token, isNil, Injector, ModuleRef } from '@tsdi/ioc';
import { Interceptor, Handler, ApplicationContext } from '@tsdi/core';
import {
    ContentSendAdapter, FileAdapter, GET, HEAD, Incoming, NotFoundException,
    Outgoing, ReadableLike, RequestContext, RestfulRequestAdapter, TopicIncoming, UrlIncoming, Header, HttpStatusCode, MimeAdapter
} from '@tsdi/common'
import { Observable, from, mergeMap, of, throwError } from 'rxjs';
import { HttpFileResult } from '../file-result';
import { HttpStaticOptions } from '../options';
import { SERVICE_STATICS_OPTIONS } from '@tsdi/service';

export interface StaticsOptions extends HttpStaticOptions {
    defer?: boolean;
}

/** @deprecated use StaticsOptions */
export type ContentOptions = StaticsOptions;

export const STATICS_OPTIONS = token<StaticsOptions>('STATICS_OPTIONS');
/** @deprecated use STATICS_OPTIONS */
export const CONTENT_OPTIONS = STATICS_OPTIONS;

@Injectable()
export class HttpContentInterceptor implements Interceptor<ReadableLike<Incoming>> {

    private options: StaticsOptions;

    constructor(
        @Optional() @Inject(STATICS_OPTIONS) options: StaticsOptions,
        @Optional() @Inject(SERVICE_STATICS_OPTIONS) serviceOptions: StaticsOptions,
        @Inject() private sender: ContentSendAdapter
    ) {
        this.options = { ...defOpts, ...serviceOptions, ...options };
    }

    intercept(input: ReadableLike<Incoming>, next: Handler<ReadableLike<Incoming>, any>, context: RequestContext): Observable<any> {
        const path = (input as UrlIncoming).url || (input as TopicIncoming).topic || input.pattern;
        if (!path || !(!input.method || input.method === HEAD || input.method === GET || input.method === '*')) {
            return next.handle(input, context);
        }

        const options = this.options;
        if (!options.defer) {
            return from(this.resolveStaticFile(input, context, options))
                .pipe(
                    mergeMap(staticResponse => {
                        if (staticResponse) {
                            return of(null);
                        }
                        return next.handle(input, context)
                            .pipe(
                                mergeMap(response => from(this.mapResponse(response, input, context)))
                            );
                    })
                );
        }

        const fileAdapter = context.get(FileAdapter);
        return next.handle(input, context)
            .pipe(
                mergeMap(async (res: Outgoing) => {
                    const file = await this.find(path, res, fileAdapter, context, options);
                    if (!file) {
                        return throwError(() => new NotFoundException());
                    }
                    return file;
                })
            );
    }

    protected find(path: string, res: Outgoing, fileAdapter: FileAdapter, context: RequestContext, options: StaticsOptions) {
        if (res.statusCode && !(res.error instanceof NotFoundException)) {
            return Promise.resolve(null);
        }
        return fileAdapter.find(path, {
            ...options,
            baseUrl: options.baseUrl ?? this.resolveBaseUrl(context.getInjector())
        });
    }

    private async mapResponse(response: any, input: ReadableLike<Incoming>, context: RequestContext): Promise<any> {
        if (this.isHttpFileResult(response)) {
            return this.resolveFileResult(response, input, context);
        }
        if (response?.body instanceof HttpFileResult) {
            const resolved = await this.resolveFileResult(response.body, input, context);
            const headerNames = response.getHeaderNames?.() ?? [];
            headerNames.forEach((name: string) => {
                if (!resolved.hasHeader(name)) {
                    resolved.setHeader(name, response.getHeader(name));
                }
            });
            if (response.statusCode && isNil(resolved.status)) {
                resolved.setStatus(response.statusCode);
            }
            return resolved;
        }
        return response;
    }

    private async resolveStaticFile(input: any, context: RequestContext, options: HttpStaticOptions): Promise<boolean> {
        const method = String(input?.method ?? '').toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
            return false;
        }
        const pathname = this.getPathname(input?.url ?? input?.pattern ?? input?.topic);
        if (!pathname) {
            return false;
        }

        const fileAdapter = context.get(FileAdapter);
        const adapter = context.get(RestfulRequestAdapter);
        if (!adapter) {
            return false;
        }
        const file = await this.sender.send(adapter, fileAdapter, pathname, {
            ...options,
            baseUrl: options.baseUrl ?? this.resolveBaseUrl(context.getInjector()),
            method,
            headers: options.headers,
            disposition: options.disposition,
            statusCode: HttpStatusCode.Ok,
            setHeaders: options.setHeaders,
        });
        return !!file;
    }

    private async resolveFileResult(result: HttpFileResult, input: any, context: RequestContext): Promise<RestfulRequestAdapter> {
        const method = String(input?.method ?? '').toUpperCase();
        const adapter = context.get(RestfulRequestAdapter);
        if (!adapter) {
            throw new NotFoundException('Not Found', HttpStatusCode.NotFound);
        }
        const fileAdapter = context.get(FileAdapter);
        if (typeof result.value === 'string') {
            const filename = fileAdapter.isAbsolute(result.value) ? result.value : fileAdapter.resolve(result.value);
            if (!fileAdapter.existsSync(filename)) {
                throw new NotFoundException('Not Found', HttpStatusCode.NotFound);
            }
            await this.sender.send(adapter, fileAdapter, filename, {
                root: '/',
                hidden: true,
                format: false,
                index: false,
                method,
                headers: result.options.headers,
                disposition: result.options.disposition,
                statusCode: result.options.statusCode ?? HttpStatusCode.Ok,
                contentType: result.options.contentType,
            });
            return adapter;
        }

        this.applyResponseHeaders(adapter, result.options.headers);
        if (result.options.statusCode) {
            adapter.setStatus(result.options.statusCode);
        }
        const mimeAdapter = context.get(MimeAdapter);
        const contentType = result.options.contentType ?? this.inferContentType(mimeAdapter, result.options.filename);
        if (contentType && !adapter.hasHeader('content-type')) {
            adapter.setHeader('content-type', contentType);
        }
        if (result.options.filename) {
            adapter.setHeader('content-disposition', this.createContentDisposition(result.options.filename, result.options.disposition ?? 'attachment'));
        }
        if (Buffer.isBuffer(result.value)) {
            adapter.setHeader('content-length', result.value.length);
        }
        if (isNil(adapter.status)) {
            adapter.setStatus(HttpStatusCode.Ok);
        }
        adapter.setPayload(method === 'HEAD' ? null : result.value);
        return adapter;
    }

    private isHttpFileResult(value: any): value is HttpFileResult {
        return value instanceof HttpFileResult;
    }

    private inferContentType(mimeAdapter: MimeAdapter | null | undefined, filename?: string): string {
        const name = filename ?? '';
        const contentType = name && mimeAdapter?.lookup(name);
        return contentType || 'application/octet-stream';
    }

    private getPathname(path?: string): string {
        if (!path) {
            return '';
        }
        const queryIndex = path.indexOf('?');
        return queryIndex >= 0 ? path.slice(0, queryIndex) : path;
    }

    private resolveBaseUrl(injector: Injector | null | undefined): string | undefined {
        let current = injector;
        while (current) {
            if (current instanceof ModuleRef) {
                const moduleAnnotation = current.moduleReflect?.getAnnotation?.() as { baseURL?: string } | undefined;
                const baseURL = moduleAnnotation?.baseURL;
                if (baseURL) {
                    return baseURL;
                }
            }
            try {
                const appContext = current.get(ApplicationContext, null);
                const baseURL = appContext?.getArguments?.()?.baseURL ?? appContext?.baseURL;
                if (baseURL) {
                    return baseURL;
                }
            } catch {
                // Continue walking parent injectors when the current scope has no app context.
            }
            const parent = current.getParent?.();
            if (!parent || parent === current) {
                break;
            }
            current = parent;
        }
        try {
            const modules = injector?.getRuntime?.().getModules?.();
            if (modules?.size) {
                for (const moduleRef of modules.values()) {
                    const moduleAnnotation = moduleRef.moduleReflect?.getAnnotation?.() as { baseURL?: string } | undefined;
                    if (moduleAnnotation?.baseURL) {
                        return moduleAnnotation.baseURL;
                    }
                }
            }
        } catch {
            // Ignore runtime lookup failures and fall back to default process resolution.
        }
        return undefined;
    }

    private applyResponseHeaders(outgoing: { setHeader(name: string, value: Header): void }, headers?: Record<string, Header>) {
        if (!headers) {
            return;
        }
        Object.entries(headers).forEach(([name, value]) => outgoing.setHeader(name, value));
    }

    private createContentDisposition(filename: string, disposition: 'inline' | 'attachment'): string {
        const fallback = filename.replace(/[\r\n"]/g, '_');
        const encoded = encodeURIComponent(filename);
        return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
    }
}

export const defOpts: StaticsOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    format: true,
    defer: false,
    immutable: false,
};
