import { mths } from '@tsdi/core';
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
        if (ctx.protocol.status.isEmpty(code)) {
            ctx.body = null;
            return protocol.write(res.socket, res.serializePacket());
        }

        // event request method not need respond.
        if (mths.EVENT === ctx.method) {
            return res;
        }

        if (mths.HEAD === ctx.method) {
            if (!res.headersSent && !res.hasHeader(hdr.CONTENT_LENGTH)) {
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
