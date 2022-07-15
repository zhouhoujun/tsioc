import { ExecptionRespondTypeAdapter, mths, TransportError } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { PassThrough } from 'stream';
import { RespondAdapter } from '../../interceptors/respond';
import { TcpServResponse } from './response';
import { TcpContext } from './context';
import { ctype, hdr } from '../../consts';
import { PacketProtocol } from '../packet';
import { isBuffer, isStream, toBuffer } from '../../utils';


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

        return protocol.write(res.socket, res.serializePacket());

        // if (isStream(body)) {
        //     if (ctx.type === ctype.APPL_JSON) {
        //         const raw = new PassThrough();
        //         body.pipe(raw);
        //         const buffers = await toBuffer(raw);
        //         const json = buffers.toString('utf8');
        //         ctx.length = Buffer.byteLength(json);
        //         res.body = json;
        //     }
        //     return protocol.write(res.socket, res.serializePacket());
        // }

        // if (isBuffer(body) || isString(body)) {
        //     return protocol.write(res.socket, res.serializePacket());
        // }
        // const jsonbody = JSON.stringify(body);
        // res.body = jsonbody;
        // if (!res.sent) {
        //     ctx.length = Buffer.byteLength(jsonbody);
        // }
        // return protocol.write(res.socket, res.serializePacket());

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
