import { Encoder, ExecptionRespondTypeAdapter, TransportError } from '@tsdi/core';
import { Injectable, isNil, isString, lang } from '@tsdi/ioc';
import { Readable } from 'stream';
import { RespondAdapter } from '../../interceptors/respond';
import { isBuffer, isStream, writeSocket } from '../../utils';
import { TcpServResponse } from './response';
import { TcpContext } from './context';
import { TcpServerOptions } from './options';
import { ev } from '../../consts';


@Injectable()
export class TcpRespondAdapter extends RespondAdapter {

    async respond(res: TcpServResponse, ctx: TcpContext): Promise<any> {
        const encoder = ctx.get(Encoder);
        const { headerSplit, encoding } = ctx.get(TcpServerOptions);

        let body = ctx.body;
        if (isNil(body)) {
            if (!res.sent) await writeSocket(res.socket, encoder.encode(res.serializeHeader()), headerSplit, encoding);
            return res;
        }


        if (isString(body)) {
            if (!res.sent) await writeSocket(res.socket, encoder.encode(res.serializeHeader()), headerSplit, encoding);
            await writeSocket(res.socket, encoder.encode({ id: res.id, body }), headerSplit, encoding);
            return res;
        }

        if (isBuffer(body)) {
            if (!res.sent) await writeSocket(res.socket, encoder.encode(res.serializeHeader()), headerSplit, encoding);
            await writeSocket(res.socket, encoder.encode({ id: res.id, body }), headerSplit, encoding);
            return res;
        } 
        
        if (isStream(body)) {
            if (!res.sent) await writeSocket(res.socket, encoder.encode(res.serializeHeader()), headerSplit, encoding);
            const defer = lang.defer();
            body.once(ev.ERROR, (err) => {
                defer.reject(err)
            });
            body.once(ev.END, () => {
                defer.resolve()
            });
            body.pipe(res.socket);
            return await defer.promise
                .then(() => {
                    if (body instanceof Readable) body.destroy();
                    return res;
                })
        }
        
        body = JSON.stringify(body);
        if (!res.sent) {
            ctx.length = Buffer.byteLength(body);
            await writeSocket(res.socket, encoder.encode(res.serializeHeader()), headerSplit, encoding);
        }
        await writeSocket(res.socket, encoder.encode({ id: res.id, body }), headerSplit, encoding);
        return res;
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
