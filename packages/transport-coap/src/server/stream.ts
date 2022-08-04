import { Injectable } from '@tsdi/ioc';
import { ProtocolServerOpts, ServerSession, ServerSessionBuilder } from '@tsdi/transport';

@Injectable()
export class CoapServerSessionBuilder  extends ServerSessionBuilder {
    build(listenOpts: ProtocolServerOpts<any>): Promise<ServerSession<any>> {
        throw new Error('Method not implemented.');
    }

}
