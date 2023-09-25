import { Injectable, isString, promisify } from '@tsdi/ioc';
import { ENOENT, HEAD, IReadableStream, Incoming, MessageExecption, Outgoing, isBuffer } from '@tsdi/common';
import { AssetContext, Responder } from '@tsdi/endpoints';
import { hdr } from './consts';


@Injectable()
export class AssetResponder<TRequest extends Incoming = any, TResponse extends Outgoing = any, TStatus = number> implements Responder<AssetContext<TRequest, TResponse, TStatus>> {

    constructor() { }

    async send(ctx: AssetContext, res: any): Promise<any> {
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

    async sendExecption(ctx: AssetContext, err: MessageExecption): Promise<any> {
        //finllay defalt send error.
        let headerSent = false;
        if (ctx.sent || !ctx.response.writable) {
            headerSent = err.headerSent = true
        }

        // nothing we can do here other
        // than delegate to the app-level
        // handler and log.
        if (headerSent) {
            return
        }

        const res = ctx.response;

        // first unset all headers
        ctx.removeHeaders();

        // then set those specified
        if (err.headers) ctx.setHeader(err.headers);

        const vaildator = ctx.vaildator;
        let status = err.status || err.statusCode;
        // ENOENT support
        if (ENOENT === err.code) status = vaildator.notFound;

        // default to serverError
        if (!vaildator.isStatus(status)) status = vaildator.serverError;

        ctx.status = status;
        // empty response.
        if (vaildator.isEmptyExecption(status)) {
            return res.end();
        }

        // respond
        let msg: any;
        msg = err.message;
        
        // force text/plain
        ctx.type = 'text';
        msg = Buffer.from(msg ?? ctx.statusMessage ?? '');
        ctx.length = Buffer.byteLength(msg);
        res.end(msg)

        return res;

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
