import { Injectable } from '@tsdi/ioc';
import { TransportServerOpts, ServerSession, ServerSessionBuilder } from '@tsdi/transport';

@Injectable()
export class CoapServerSessionBuilder  extends ServerSessionBuilder {
    build(listenOpts: TransportServerOpts<any>): Promise<ServerSession> {
        throw new Error('Method not implemented.');
    }

}
