import { HandlerFn, InterceptorFn } from '@tsdi/core';
import { ENOENT,  TransportContext } from '@tsdi/common/transport';
import { of } from 'rxjs';
import { HttpContext } from '../context';


/**
 * http execption serialize
 */
export const httpExecptionSerializeInterceptor: InterceptorFn<HttpContext> = (input: HttpContext, next: HandlerFn, context: TransportContext) => {
    if (input.execption) {
        const err = input.execption;

        // first unset all headers
        input.removeHeaders();

        // then set those specified
        if (err.headers) input.setHeader(err.headers);

        const statusAdapter = input.statusAdapter!;
        let status: number = err.status || err.statusCode;
        // ENOENT support
        if (ENOENT === err.code) status = statusAdapter.notFound;

        // default to serverError
        if (!statusAdapter.isStatus(status)) status = statusAdapter.serverError;

        input.status = status;
        // empty response.
        if (statusAdapter.isEmptyExecption(status)) {
            return of({ payload: null });
        }

        // respond
        let msg: any;
        msg = err.message;

        // force text/plain
        input.type = 'text';
        msg = Buffer.from(msg ?? input.statusMessage ?? '');
        input.length = Buffer.byteLength(msg);
        return of({ payload: msg });
    }
    return next(input, context)
}