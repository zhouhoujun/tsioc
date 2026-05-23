import { Injectable } from '@tsdi/ioc';
import { ResponseFactory, ResponseEvent } from '@tsdi/common';

@Injectable()
export class HttpResponseEventFactory implements ResponseFactory<number> {
    create(options: { ok?: boolean; error?: any; body?: any; payload?: any; status?: number; headers?: any }): ResponseEvent<any> {
        if (options.ok === false || options.error) {
            return {
                ok: false,
                status: options.status ?? 500,
                body: options.error ?? options.body ?? options.payload,
                headers: options.headers ?? {}
            } as ResponseEvent<any>;
        }
        return {
            ok: true,
            status: options.status ?? 200,
            body: options.body ?? options.payload,
            headers: options.headers ?? {}
        } as ResponseEvent<any>;
    }
}
