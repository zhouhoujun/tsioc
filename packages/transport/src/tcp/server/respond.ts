import { Encoder, ExecptionRespondTypeAdapter, TransportError } from '@tsdi/core';
import { Injectable, lang } from '@tsdi/ioc';
import { RespondAdapter } from '../../interceptors/respond';
import { TcpResponse } from '../client/response';
import { TcpContext } from './context';
import { TcpServerOptions } from './server';


@Injectable()
export class TcpRespondAdapter extends RespondAdapter {

    async respond(res: TcpResponse, ctx: TcpContext): Promise<any> {
        const buffer = ctx.get(Encoder).encode(res);
        const split = ctx.get(TcpServerOptions).headerSplit;
        const data = `${buffer.length}${split}${buffer}`;
        const defer = lang.defer();
        ctx.response.socket.write(data, (err) => {
            err ? defer.reject(err) : defer.resolve();
        });
        await defer.promise;
        return res;
    }

}


@Injectable()
export class TcpExecptionRespondTypeAdapter extends ExecptionRespondTypeAdapter {
    respond<T>(ctx: TcpContext, response: 'body' | 'header' | 'response', value: T): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            throw new TransportError('Tcp not support header response');
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
