import { Encoder, ExecptionRespondTypeAdapter, TransportError } from '@tsdi/core';
import { Injectable, lang } from '@tsdi/ioc';
import { RespondAdapter } from '../../interceptors/respond';
import { writeSocket } from '../../utils';
import { TcpServResponse } from './response';
import { TcpContext } from './context';
import { TcpServerOptions } from './server';


@Injectable()
export class TcpRespondAdapter extends RespondAdapter {

    async respond(res: TcpServResponse, ctx: TcpContext): Promise<any> {
        const encoder = ctx.get(Encoder);
        const headers = res.getHeaders();
        const { headerSplit, encoding } = ctx.get(TcpServerOptions);
        await writeSocket(res.socket, encoder.encode({ id: res.id, headers }), headerSplit, encoding);
        if (ctx.length) {
            await writeSocket(res.socket, encoder.encode({ id: res.id, body: res.body }), headerSplit, encoding);
        }
        return res;
    }

}


@Injectable()
export class TcpExecptionRespondTypeAdapter extends ExecptionRespondTypeAdapter {
    respond<T>(ctx: TcpContext, response: 'body' | 'header' | 'response', value: T): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            // throw new TransportError('Tcp not support header response');
            // ctx.setHeader(value as Record<string, any>);
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
