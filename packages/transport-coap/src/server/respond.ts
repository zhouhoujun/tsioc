import { Injectable } from '@tsdi/ioc';
import { AssetContext } from '@tsdi/core';
import { RespondAdapter, toBuffer } from '@tsdi/transport';
import { IncomingMessage } from 'coap';
import { CoapOutgoing } from './outgoing';

@Injectable()
export class CoapRespondAdapter extends RespondAdapter<IncomingMessage, CoapOutgoing, number> {

    protected override async respondStream(body: any, res: CoapOutgoing, ctx: AssetContext<IncomingMessage, CoapOutgoing, number, any>): Promise<void> {
        const buffers = await toBuffer(body);
        res.end(buffers);
    }
}