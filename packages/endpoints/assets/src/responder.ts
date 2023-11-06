import { Injectable, isString, promisify } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { AssetTransportOpts, HEAD, IReadableStream, Incoming, MessageExecption, Outgoing, PacketLengthException, StatusCode, hdr, isBuffer } from '@tsdi/common';
import { AssetContext, Responder } from '@tsdi/endpoints';

@Injectable()
export class AssetResponder<TRequest extends Incoming = any, TResponse extends Outgoing = any> implements Responder<AssetContext<TRequest, TResponse>> {

    constructor() { }

    async send(ctx: AssetContext, res: TResponse): Promise<any> {
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

        const len = ctx.length ?? 0;
        const opts = ctx.serverOptions.transportOpts as AssetTransportOpts;
        if (opts.payloadMaxSize && len > opts.payloadMaxSize) {
            const btpipe = ctx.get<PipeTransform>('bytes-format');
            throw new PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(opts.payloadMaxSize)}`);
        }

        return await this.respondBody(body, response, ctx);
    }

    protected isHeadMethod(ctx: AssetContext<TRequest, TResponse>): boolean {
        return HEAD === ctx.method
    }

    protected respondHead(res: TResponse, ctx: AssetContext<TRequest, TResponse>) {
        if (!res.headersSent && !res.hasHeader(hdr.CONTENT_LENGTH)) {
            const length = ctx.length;
            if (Number.isInteger(length)) ctx.length = length
        }
        return res.end()
    }

    protected respondNoBody(status: StatusCode, res: TResponse, ctx: AssetContext<TRequest, TResponse>) {
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

    protected async respondBody(body: any, res: TResponse, ctx: AssetContext<TRequest, TResponse>) {
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

    protected async respondStream(body: IReadableStream, res: TResponse, ctx: AssetContext<TRequest, TResponse>): Promise<void> {
        const streamAdapter = ctx.streamAdapter;
        if (!streamAdapter.isWritable(res)) throw new MessageExecption('response is not writable, no support strem.');
        return await streamAdapter.pipeTo(body, res);
    }

    protected statusMessage(ctx: AssetContext<TRequest, TResponse>, status: StatusCode): string {
        return ctx.statusMessage ?? String(status);
    }

}
