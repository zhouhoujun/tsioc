import { Injectable, isString, promisify } from '@tsdi/ioc';
import { HEAD, MessageExecption } from '@tsdi/common';
import { hdr } from '../consts';
import { isBuffer } from '../utils';
import { Incoming, Outgoing } from '../socket';
import { AssetContext } from '../AssetContext';
import { IReadableStream } from '../stream';


@Injectable()
export class RespondAdapter<TRequest extends Incoming = any, TResponse extends Outgoing = any, TStatus = number> {

    constructor() {
    }

    async respond(ctx: AssetContext<TRequest, TResponse, TStatus>): Promise<any> {

        const vaildator = ctx.vaildator;
        if (ctx.destroyed || !ctx.writable) return;

        const { body, status, response } = ctx;

        // ignore body
        if (vaildator.isEmpty(status)) {
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
        if (isBuffer(body)) return await promisify<any, void>(res.end, res)(body);
        if (isString(body)) return await promisify<any, void>(res.end, res)(Buffer.from(body));

        if (ctx.streamAdapter.isReadable(body)) {
            return await this.respondStream(body, res, ctx);
        }

        // body: json
        body = Buffer.from(JSON.stringify(body));
        if (!res.headersSent) {
            ctx.length = Buffer.byteLength(body)
        }

        await promisify<any, void>(res.end, res)(body);
        return res
    }

    protected async respondStream(body: IReadableStream, res: TResponse, ctx: AssetContext<TRequest, TResponse, TStatus>): Promise<void> {
        const streamAdapter = ctx.streamAdapter;
        if (!streamAdapter.isWritable(res)) throw new MessageExecption('response is not writable, no support strem.');
        return await streamAdapter.pipeTo(body, res);
    }

    protected statusMessage(ctx: AssetContext<TRequest, TResponse, TStatus>, status: TStatus): string {
        return ctx.statusMessage ?? String(status);
    }

}