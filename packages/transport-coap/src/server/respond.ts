import { Injectable } from '@tsdi/ioc';
import { AssetContext, MessageExecption } from '@tsdi/core';
import { RespondAdapter } from '@tsdi/transport';
import { IncomingMessage } from 'coap';
import { CoapOutgoing } from './outgoing';

@Injectable()
export class CoapRespondAdapter extends RespondAdapter<IncomingMessage, CoapOutgoing, number> {



    protected override async respondStream(body: any, res: CoapOutgoing, ctx: AssetContext<IncomingMessage, CoapOutgoing, number, any>): Promise<void> {
        const streamAdapter = ctx.streamAdapter;
        if (!streamAdapter.isWritable(res)) throw new MessageExecption('response is not writable, no support strem.');
        return streamAdapter.pipeTo(body, res).finally(()=>{
            res.end();
        });
    }
}