import { EmptyStatus, Endpoint, EndpointBackend, EndpointContext, Interceptor, InterceptorFilter, mths, NEXT, Outgoing, ServerEndpointContext, TransportExecption } from '@tsdi/core';
import { Abstract, Injectable, isString } from '@tsdi/ioc';
import { Writable } from 'stream';
import { TransportContext } from './context';
import { hdr } from '../consts';
import { isBuffer, isStream, pipeStream } from '../utils';
import { mergeMap, Observable } from 'rxjs';


@Abstract()
export abstract class ReceiveBackend<IInput = any, TOutput extends ServerEndpointContext = ServerEndpointContext> implements EndpointBackend<IInput, TOutput> {
    abstract handle(input: IInput, context: EndpointContext): Observable<TOutput>;
}


// @Abstract()
// export abstract class RespondInterceptor<IInput = any, TOutput = any> implements Interceptor<IInput, TOutput> {

//     constructor() { }

//     intercept(req: IInput, next: Endpoint<IInput, TOutput>, ctx: TransportContext): Observable<TOutput> {
//         return next.handle(req, ctx)
//             .pipe(
//                 mergeMap(res => {
//                     // this.respond(res, ctx)
//                     const filter = ctx.target.filter()
//                     return filter.handle(ctx, NEXT);
//                 })
//             )
//     }

//     protected abstract respond(res: TOutput, ctx: EndpointContext): Promise<any>;
// }



@Injectable({ static: true })
export class ServerInterceptorFinalizeFilter extends InterceptorFilter {

    intercept(input: any, next: Endpoint<any, any>, context: TransportContext): Observable<any> {
        return next.handle(input, context)
            .pipe(
                mergeMap(res => {
                    return this.respond(res, context)
                })
            )
    }

    protected async respond(res: Outgoing, ctx: TransportContext): Promise<any> {

        if (!ctx.writable) return;

        let body = ctx.body;
        const status = ctx.status;

        // ignore body
        if (ctx.status instanceof EmptyStatus) {
            // strip headers
            ctx.body = null;
            return res.end()
        }

        if (mths.HEAD === ctx.method) {
            if (!res.headersSent && !res.hasHeader(hdr.CONTENT_LENGTH)) {
                const length = ctx.length;
                if (Number.isInteger(length)) ctx.length = length
            }
            return res.end()
        }

        // status body
        if (null == body) {
            if (ctx._explicitNullBody) {
                res.removeHeader(hdr.CONTENT_TYPE);
                res.removeHeader(hdr.CONTENT_LENGTH);
                res.removeHeader(hdr.TRANSFER_ENCODING);
                return res.end()
            }

            body = status.statusText || String(status.status);
            body = Buffer.from(body);
            if (!res.headersSent) {
                ctx.type = 'text';
                ctx.length = Buffer.byteLength(body)
            }
            return res.end(body)
        }


        // responses
        if (isBuffer(body)) return res.end(body);
        if (isString(body)) return res.end(Buffer.from(body));
        if (isStream(body)) {
            if (!(res instanceof Writable)) throw new TransportExecption('response is not writable, no support strem.');
            await pipeStream(body, res);
        }

        // body: json
        body = Buffer.from(JSON.stringify(body));
        if (!res.headersSent) {
            ctx.length = Buffer.byteLength(body)
        }
        res.end(body);
        return res
    }

}
