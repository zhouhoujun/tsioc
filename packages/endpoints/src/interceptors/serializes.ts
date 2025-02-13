import { hasProps, isNil, isString, isUndefined } from '@tsdi/ioc';
import { BackendFn, HandlerFn, InterceptorFn, PipeTransform } from '@tsdi/core';
import { HEAD } from '@tsdi/common';
import { AbstractTransport, Outgoing, Packet, PacketLengthException, TransportContext } from '@tsdi/common/transport';
import { map, of, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';


export const packetIfySerializeInterceptor: InterceptorFn<RequestContext> = (input: RequestContext, next: HandlerFn<RequestContext>, context: TransportContext) => {
    return next(input, context)
        .pipe(
            map(pkg => {
                let payload: any;
                if (isUndefined(pkg.payload)) {
                    const id = input.response.id ?? input.request.id;
                    payload = pkg;
                    pkg = { id };
                } else {
                    payload = pkg.payload;
                }
                if (isString(payload)) {
                    pkg.payload = payload = Buffer.from(payload);
                }
                if (isNil(pkg.contentLength)) {
                    pkg.contentLength = Buffer.byteLength(payload)
                }
                return pkg;
            })
        )
}

/**
 * execption serialize
 */
export const execptionSerializeInterceptor: InterceptorFn<RequestContext> = (input: RequestContext, next: HandlerFn<RequestContext, Packet>, context: TransportContext) => {
    if (input.execption) {
        const execption = input.execption;
        if (!isNil(execption.status)) input.status = execption.status;
        input.statusMessage = execption.message;
        // const id = input.response.id ?? input.request.id;
        // const pkg = {
        //     id
        // } as Outgoing;
        // if (input.status) {
        //     pkg.statusCode = input.status;
        // }
        // if (input.statusMessage) {
        //     pkg.statusMessage = input.statusMessage;
        // }
        // pkg.error = {
        //     name: execption.name,
        //     status: input.status,
        //     message: execption.message,
        // }
        // return of({ payload: JSON.stringify(pkg) })


        input.body = null;
        input.response.error = {
            name: execption.name,
            status: input.status,
            message: execption.message,
        };

    }
    return next(input, context)
}

/**
 * empty status serialize
 */
export const emptyStatusSerializeInterceptor: InterceptorFn<RequestContext> = (input: RequestContext, next: HandlerFn<RequestContext, Packet>, context: TransportContext) => {
    if (input.statusAdapter?.isEmpty(input.status)) {
        const payload = input.body = null;
        return of({
            payload
        })
    }
    return next(input, context)
}

export const headMethodSerializeInterceptor: InterceptorFn<RequestContext> = (input: RequestContext, next: HandlerFn<RequestContext, Packet>, context: TransportContext) => {
    if (input.method?.toUpperCase() == HEAD) {
        if (!input.headersSent && !input.headerAdapter?.hasContentLength(input.response.headers ?? input.response)) {
            const length = input.length;
            if (Number.isInteger(length)) input.length = length
        }
        return of({
            payload: null
        })
    }
    return next(input, context)
}


export const noBodySerializeInterceptor: InterceptorFn<RequestContext> = (input: RequestContext, next: HandlerFn<RequestContext, Packet>, context: TransportContext) => {
    if (input.body === null) {
        if (input.explicitNullBody) {
            const headers = input.response.headers ?? input.response;
            input.headerAdapter.setContentType(headers, null);
            input.headerAdapter.setContentLength(headers, null);
            input.headerAdapter.setContentEncoding(headers, null);
            input.headerAdapter.setTransferEncoding(headers, null);
            return of({
                payload: null
            })
        }

        const payload = Buffer.from(input.statusMessage ?? String(input.status));
        if (!input.headersSent) {
            input.type = 'text';
            input.length = Buffer.byteLength(payload)
        }
        return of({
            payload
        })

    }
    return next(input, context)
}


/**
 * request context body lenght limit
 * @param input 
 * @param next 
 * @param context 
 * @returns 
 */
export const lengthLimitSerializeInterceptor: InterceptorFn<RequestContext> = (input: RequestContext, next: HandlerFn<RequestContext, Packet>, context: TransportContext) => {
    const { injector, options } = context.transport as AbstractTransport;
    const length = input.length;
    const sizeLimit = options.maxSize ?? options.limit;
    if (length && sizeLimit && length > sizeLimit) {
        const btpipe = injector.get<PipeTransform>('bytes-format');
        return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(sizeLimit)}`));
    }
    return next(input, context);
}

/**
 * request context servializ
 * @param input 
 * @param next 
 * @param context 
 * @returns 
 */
export const requestContextSerializeBackend: BackendFn<RequestContext> = (input: RequestContext, context: TransportContext) => {

    const id = input.response.id ?? input.request.id;
    const headers = input.headerAdapter.getHeaders(input.response.headers);
    const pkg = {
        id
    } as Outgoing;
    if (input.status) {
        pkg.statusCode = input.status;
    }
    if (input.statusMessage) {
        pkg.statusMessage = input.statusMessage;
    }

    if (hasProps(headers)) {
        pkg.headers = headers;
    }

    if (input.streamAdapter.isReadable(input.body)) {
        let contentLength = input.length || 0;
        if (id) {
            const idLen = input.transport.options.idLen ?? 2;
            const idBuff = Buffer.alloc(idLen);
            if (idLen > 4) {
                idBuff.write(id.toString());
            } else {
                idBuff.writeUIntBE(id as number, 0, idLen);
            }
            input.body.unshift(idBuff);
            contentLength += idLen;
        }
        return of(
            {
                id,
                headers,
                payload: Buffer.from(JSON.stringify(pkg)),
            },
            {
                id,
                payload: input.body,
                contentLength
            })
    } else {
        const payload = JSON.stringify(pkg);
        if (!input.headersSent) {
            input.length = Buffer.byteLength(payload);
        }
        return of(payload);
    }
}

/**
 * request context servialize body only
 * @param input 
 * @param next 
 * @param context 
 * @returns 
 */
export const requestContextSerializeBodyOnlyBackend: BackendFn<RequestContext> = (input: RequestContext, context: TransportContext) => {
    if (input.streamAdapter.isJson(input.body)) {
        const body = JSON.stringify(input.body);
        if (!input.headersSent) {
            input.length = Buffer.byteLength(body);
        }
        return of(body)
    }
    return of(input.body)
}


/**
 * request context servializ
 * @param input 
 * @param next 
 * @param context 
 * @returns 
 */
export const requestContextServializeInterceptor: InterceptorFn<RequestContext> = (input: RequestContext, next: HandlerFn, context: TransportContext) => {

    const id = input.response.id ?? input.request.id;
    const headers = input.headerAdapter.getHeaders(input.response.headers);
    const pkg = {
        id
    } as Outgoing;
    if (input.status) {
        pkg.statusCode = input.status;
    }
    if (input.statusMessage) {
        pkg.statusMessage = input.statusMessage;
    }

    if (input.response.error) {
        pkg.error = input.response.error;
    }

    if (hasProps(headers)) {
        pkg.headers = headers;
    }

    if (input.streamAdapter.isReadable(input.body)) {
        let contentLength = input.length || 0;
        if (id) {
            const idLen = input.transport.options.idLen ?? 2;
            const idBuff = Buffer.alloc(idLen);
            if (idLen > 4) {
                idBuff.write(id.toString());
            } else {
                idBuff.writeUIntBE(id as number, 0, idLen);
            }
            input.body.unshift(idBuff);
            contentLength += idLen;
        }
        return of(
            {
                id,
                headers,
                payload: Buffer.from(JSON.stringify(pkg)),
            },
            {
                id,
                headers,
                payload: input.body,
                contentLength
            })
    }

    pkg.body = input.body;
    return next(pkg, context)
        .pipe(
            map(payload => {
                if (typeof payload === 'string') {
                    payload = Buffer.from(payload);
                }
                return {
                    id,
                    headers,
                    payload,
                    contentLength: payload.length
                };
            }));
}

