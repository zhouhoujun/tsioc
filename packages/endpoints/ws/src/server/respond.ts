import { MessageExecption } from '@tsdi/common';
import { Responder, TransportContext } from '@tsdi/endpoints';
import { WsTransportSession } from '../factory';
import { MessageOutgoing } from '@tsdi/endpoints/assets';
import { lastValueFrom } from 'rxjs';


export class WsResponder implements Responder {

    constructor(readonly session: WsTransportSession) {

    }

    async send(ctx: TransportContext<any, any, any>, res: any): Promise<any> {
        if (ctx.response instanceof MessageOutgoing) {
            const resp = ctx.response;
            const pkg = {
                header: resp.getHeaders(),
                id: resp.id
            }

            

            await lastValueFrom(this.session.send(pkg));
        } else {
            await lastValueFrom(this.session.send(res));
        }
    }
    sendExecption(context: TransportContext<any, any, any>, err: MessageExecption): Promise<any> {
        throw new Error('Method not implemented.');
    }

}
