import { ApplicationContext } from '@tsdi/core';
import { FileAdapter, MimeAdapter, NotFoundException, RequestContext, RequestHandler, RequestInterceptor, StatusMessageAdapter } from '@tsdi/common'
import { Injectable } from '@tsdi/ioc';
import { basename } from 'node:path';
import { from, mergeMap, Observable, of } from 'rxjs';
import { CoapMessageAdapter } from '../message-adapter';

@Injectable()
export class CoapContentInterceptor implements RequestInterceptor<any> {
    intercept(input: any, next: RequestHandler<any, any, RequestContext>, context: RequestContext): Observable<any> {
        const url = input?.url;
        const method = String(input?.method ?? 'GET').toUpperCase();
        if (!url || (!input?.url && input?.pattern) || (method !== 'GET' && method !== 'HEAD')) {
            return next.handle(input, context);
        }

        return from(this.find(url, context)).pipe(
            mergeMap(file => {
                if (!file) {
                    return next.handle(input, context);
                }
                return from(this.resolveStaticResponse(file, context));
            })
        );
    }

    private async resolveStaticResponse(file: any, context: RequestContext) {
        const adapter = context.get(StatusMessageAdapter);
        const fileAdapter = context.get(FileAdapter);
        const mimeAdapter = context.getInjector().get(MimeAdapter, null);
        const ext = file.encodingExt ?? fileAdapter.extname(file.filename);
        if (ext === '.json') {
            adapter?.setPayload(await fileAdapter.readJSON(file.filename));
            return adapter;
        }
        adapter?.setPayload(await fileAdapter.readText(file.filename));
        if (adapter && !adapter.hasHeader('content-type')) {
            const contentType = mimeAdapter?.lookup(basename(file.filename, file.encodingExt ?? ''));
            adapter.setHeader('content-type', typeof contentType === 'string' ? contentType : 'text/plain');
        }
        return adapter;
    }

    private async find(path: string, context: RequestContext) {
        const adapter = context.get(StatusMessageAdapter);
        if (adapter?.status && !(adapter.error instanceof NotFoundException)) {
            return null;
        }
        const appContext = context.getInjector().get(ApplicationContext, null) as any;
        let baseURL: string | undefined;
        try {
            baseURL = appContext?.getArguments?.()?.baseURL;
        } catch {
            baseURL = undefined;
        }
        const fileAdapter = context.get(FileAdapter);
        const pathname = path.split('?', 1)[0].replace(/^\//, '');
        return fileAdapter.find(pathname, {
            root: ['public', 'test/public'],
            index: 'index.html',
            maxAge: 0,
            format: true,
            hidden: false,
            immutable: false,
            baseUrl: baseURL
        });
    }
}
