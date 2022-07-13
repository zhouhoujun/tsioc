import { ExecptionRespondTypeAdapter, mths, TransportError } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { RespondAdapter } from '../../interceptors/respond';
import { TcpServResponse } from './response';
import { TcpContext } from './context';
import { hdr } from '../../consts';
import { PacketProtocol } from '../packet';
import { isBuffer, isStream } from '../../utils';


@Injectable()
export class TcpRespondAdapter extends RespondAdapter {

    async respond(res: TcpServResponse, ctx: TcpContext): Promise<any> {

        const protocol = ctx.get(PacketProtocol);
        const body = ctx.body;
        const code = ctx.status;
        if (ctx.adapter.isEmpty(code)) {
            ctx.body = null;
            return protocol.write(res.socket, res.serializePacket());
        }

        // event request method not need respond.
        if (mths.EVENT === ctx.method) {
            return res;
        }

        if (mths.HEAD === ctx.method) {
            if (!res.sent && !res.hasHeader(hdr.CONTENT_LENGTH)) {
                const length = ctx.length;
                if (Number.isInteger(length)) ctx.length = length
            }
            return protocol.write(res.socket, res.serializePacket());
        }

        // status body
        if (null == body) {
            res.removeHeader(hdr.CONTENT_TYPE);
            res.removeHeader(hdr.CONTENT_LENGTH);
            res.removeHeader(hdr.TRANSFER_ENCODING);
            return protocol.write(res.socket, res.serializePacket());
        }

        if (isStream(body) || isBuffer(body) || isString(body)) {
            return protocol.write(res.socket, res.serializePacket());
        }
        const jsonbody = JSON.stringify(body);
        if (!res.sent) {
            ctx.length = Buffer.byteLength(jsonbody);
        }
        return protocol.write(res.socket, { id: res.id, headers:res.getHeaders(), body: jsonbody });

        // if (isString(body)) {
        //     if (!res.sent) await writeSocket(res.socket, res.id, 0, encoder.encode(res.serializeHeader()), delimiter, encoding);
        //     await writeSocket(res.socket, res.id!, 1, encoder.encode({ id: res.id, body }), delimiter, encoding);
        //     return res;
        // }

        // if (isBuffer(body)) {
        //     if (!res.sent) await writeSocket(res.socket, res.id, 0, encoder.encode(res.serializeHeader()), delimiter, encoding);
        //     await writeSocket(res.socket, res.id!, 1, encoder.encode({ id: res.id, body }), delimiter, encoding);
        //     return res;
        // }

        // if (isStream(body)) {
        //     if (!res.sent) await writeSocket(res.socket, res.id, 0, encoder.encode(res.serializeHeader()), delimiter, encoding);
        //     res.socket.write(1 + res.id!);
        //     const defer = lang.defer();
        //     body.once(ev.ERROR, (err) => {
        //         defer.reject(err)
        //     });
        //     body.once(ev.END, () => {
        //         defer.resolve()
        //     });
        //     body.pipe(res.socket);
        //     return await defer.promise
        //         .then(() => {
        //             if (body instanceof Readable) body.destroy();
        //             return res;
        //         })
        // }

        // body = JSON.stringify(body);
        // if (!res.sent) {
        //     ctx.length = Buffer.byteLength(body);
        //     await writeSocket(res.socket, res.id, 0, encoder.encode(res.serializeHeader()), delimiter, encoding);
        // }
        // await writeSocket(res.socket, res.id, 1, encoder.encode({ body }), delimiter, encoding);
        // return res;
    }

}


@Injectable()
export class TcpExecptionRespondTypeAdapter extends ExecptionRespondTypeAdapter {
    respond<T>(ctx: TcpContext, response: 'body' | 'header' | 'response', value: T): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            ctx.setHeader(value as Record<string, any>);
        } else if (response === 'response') {
            if (value instanceof TransportError) {
                ctx.status = value.statusCode;
                ctx.statusMessage = value.message
            } else {
                ctx.status = 500;
                ctx.statusMessage = String(value)
            }
        }
    }
}
