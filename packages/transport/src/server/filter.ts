import {
    GuardHandler, Filter, MessageExecption, AssetContext, Backend, Outgoing, TransportContext, HEAD
} from '@tsdi/core';
import { Abstract, Injectable, isString } from '@tsdi/ioc';
import { mergeMap, Observable } from 'rxjs';
import { Writable } from 'stream';
import { hdr } from '../consts';
import { isBuffer } from '../utils';
import { StatusVaildator } from '../status';
import { StreamAdapter } from '../stream';


@Abstract()
export abstract class ReceiveBackend<IInput extends TransportContext = TransportContext, TOutput = any> implements Backend<IInput, TOutput> {
    abstract handle(context: IInput): Observable<TOutput>;
}


@Injectable({ static: true })
export class ServerFinalizeFilter extends Filter {

    constructor(
        private vaildator: StatusVaildator,
        private streamAdapter: StreamAdapter) {
        super()
    }

    intercept(context: AssetContext, next: GuardHandler<any, any>): Observable<any> {
        return next.handle(context)
            .pipe(
                mergeMap(res => {
                    return this.respond(context)
                })
            )
    }

    protected async respond(ctx: AssetContext): Promise<any> {

        if (ctx.destroyed || !ctx.writable) return;

        const res: Outgoing = ctx.response;

        let body = ctx.body;
        const status = ctx.status;

        // ignore body
        if (this.vaildator.isEmpty(status)) {
            // strip headers
            ctx.body = null;
            return res.end()
        }

        if (HEAD === ctx.method) {
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

            body = ctx.statusMessage || String(status);
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
        if (this.streamAdapter.isStream(body)) {
            if (!(res instanceof Writable)) throw new MessageExecption('response is not writable, no support strem.');
            await this.streamAdapter.pipeTo(body, res);
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
