import { AssetContext, HEAD, Incoming, MessageExecption, Outgoing } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { StatusVaildator } from '../status';
import { StreamAdapter } from '../stream';
import { hdr } from '../consts';
import { isBuffer } from '../utils';


@Injectable()
export class RespondAdapter<TRequest extends Incoming = any, TResponse extends Outgoing = any, TStatus = number> {

    constructor(
        private vaildator: StatusVaildator<TStatus>,
        private streamAdapter: StreamAdapter) {
    }

    async respond(ctx: AssetContext<TRequest, TResponse, TStatus>): Promise<any> {

        if (ctx.destroyed || !ctx.writable) return;

        const { body, status, response } = ctx;

        // ignore body
        if (this.vaildator.isEmpty(status)) {
            // strip headers
            ctx.body = null;
            return response.end()
        }

        if (this.isHeadMethod(ctx)) {
            return this.respondHead(response, ctx);
        }

        // status body
        if (null == body) {
            return this.respondNoBody(status, response, ctx);
        }

        return await this.respondBody(body, response, ctx);
    }


    protected isHeadMethod(ctx: AssetContext<TRequest, TResponse, TStatus>): boolean {
        return HEAD === ctx.method
    }

    protected respondHead(res: TResponse, ctx: AssetContext<TRequest, TResponse, TStatus>) {
        if (!res.headersSent && !res.hasHeader(hdr.CONTENT_LENGTH)) {
            const length = ctx.length;
            if (Number.isInteger(length)) ctx.length = length
        }
        return res.end()
    }

    protected respondNoBody(status: TStatus, res: TResponse, ctx: AssetContext<TRequest, TResponse, TStatus>) {
        if (ctx._explicitNullBody) {
            res.removeHeader(hdr.CONTENT_TYPE);
            res.removeHeader(hdr.CONTENT_LENGTH);
            res.removeHeader(hdr.TRANSFER_ENCODING);
            return res.end()
        }

        const body = Buffer.from(this.statusMessage(ctx, status));
        if (!res.headersSent) {
            ctx.type = 'text';
            ctx.length = Buffer.byteLength(body)
        }
        return res.end(body)
    }

    protected async respondBody(body: any, res: TResponse, ctx: AssetContext<TRequest, TResponse, TStatus>) {
        // responses
        if (isBuffer(body)) return res.end(body);
        if (isString(body)) return res.end(Buffer.from(body));
        if (this.streamAdapter.isStream(body)) {
            if (!this.streamAdapter.isWritable(res)) throw new MessageExecption('response is not writable, no support strem.');
            return await this.streamAdapter.pipeTo(body, res);
        }

        // body: json
        body = Buffer.from(JSON.stringify(body));
        if (!res.headersSent) {
            ctx.length = Buffer.byteLength(body)
        }
        res.end(body);
        return res
    }

    protected statusMessage(ctx: AssetContext<TRequest, TResponse, TStatus>, status: TStatus): string {
        return ctx.statusMessage ?? String(status);
    }

}