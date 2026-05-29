import { ApplicationContext } from '@tsdi/core';
import { FileAdapter, MimeAdapter, NotFoundException, RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common'
import { RESPONSE } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';
import { basename } from 'node:path';
import { from, mergeMap, Observable } from 'rxjs';

@Injectable()
export class CoapContentInterceptor implements RequestInterceptor<any> {
    intercept(input: any, next: RequestHandler<any, any, RequestContext>, context: RequestContext): Observable<any> {
        const url = input?.url;
        const method = String(input?.method ?? 'GET').toUpperCase();
        if (!url || (!input?.url && input?.pattern) || (method !== 'GET' && method !== 'HEAD')) {
            return next.handle(input, context);
        }

        return from(this.find(url, context)).pipe(
            mergeMap(async file => {
                if (!file) {
                    return next.handle(input, context);
                }
                const response = context.get(RESPONSE);
                const fileAdapter = context.get(FileAdapter);
                const mimeAdapter = context.getInjector().get(MimeAdapter, null);
                const ext = file.encodingExt ?? fileAdapter.extname(file.filename);
                if (ext === '.json') {
                    response.body = await fileAdapter.readJSON(file.filename);
                    return response;
                }
                response.body = await fileAdapter.readText(file.filename);
                if (!response.hasHeader('content-type')) {
                    const contentType = mimeAdapter?.lookup(basename(file.filename, file.encodingExt ?? ''));
                    response.setHeader('content-type', typeof contentType === 'string' ? contentType : 'text/plain');
                }
                return response;
            }),
            mergeMap(result => result instanceof Promise ? result : Promise.resolve(result))
        );
    }

    private async find(path: string, context: RequestContext) {
        const response = context.get(RESPONSE);
        if (response.statusCode && !(response.error instanceof NotFoundException)) {
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
