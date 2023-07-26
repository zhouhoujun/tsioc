import { Injectable } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { AssetContext, RespondAdapter } from '@tsdi/transport';
import { TcpIncoming } from './incoming';
import { TcpOutgoing } from './outgoing';

@Injectable()
export class TcpRespondAdapter extends RespondAdapter<TcpIncoming, TcpOutgoing, number> {

    protected override statusMessage(ctx: AssetContext, status: number | string): string {
        return ctx.statusMessage || statusMessage[status as HttpStatusCode] || String(status)
    }
}