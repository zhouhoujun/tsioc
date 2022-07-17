import { ExecptionRespondTypeAdapter, mths, TransportError } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { RespondAdapter } from '../../interceptors/respond';
import { TcpServResponse } from './response';
import { TcpContext } from './context';
import { hdr } from '../../consts';
import { PacketProtocol } from '../packet';


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
