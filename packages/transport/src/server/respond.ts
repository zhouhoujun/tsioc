import { ExecptionRespondTypeAdapter, mths, TransportError } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { RespondAdapter } from '../interceptors/respond';
import { ServerResponse } from './res';
import { PrototcolContext } from './context';
import { hdr } from '../consts';


@Injectable()
export class ProtocolRespondAdapter extends RespondAdapter {

    async respond(res: ServerResponse, ctx: PrototcolContext): Promise<any> {


        const body = ctx.body;
        const code = ctx.status;
        if (ctx.adapter.isEmpty(code)) {
            ctx.body = null;
            return res.end(body);
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
            return res.end(body);
        }

        // status body
        if (null == body) {
            res.removeHeader(hdr.CONTENT_TYPE);
            res.removeHeader(hdr.CONTENT_LENGTH);
            res.removeHeader(hdr.TRANSFER_ENCODING);
            return res.end();
        }

        return res.end(body);

    }

}


@Injectable()
export class TcpExecptionRespondTypeAdapter extends ExecptionRespondTypeAdapter {
    respond<T>(ctx: PrototcolContext, response: 'body' | 'header' | 'response', value: T): void {
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
