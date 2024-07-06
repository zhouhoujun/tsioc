import { Injectable } from '@tsdi/ioc';
import { HeadersLike, Pattern, RequestParams } from '@tsdi/common';
import { ClientIncomingCloneOpts, ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, IncomingCloneOpts, IncomingFactory, IncomingOpts, IncomingPacket } from '@tsdi/common/transport';



export class WsIncoming<T> extends IncomingPacket<T> {

    clone(): WsIncoming<T>;
    clone<V>(update: IncomingCloneOpts<V>): WsIncoming<V>;
    clone(update: IncomingCloneOpts<T>): WsIncoming<T>;
    clone(update: IncomingCloneOpts<any> = {}): WsIncoming<any> {
        const opts = this.cloneOpts(update);
        return new WsIncoming(opts);

    }

}

@Injectable()
export class WsIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T> & { pattern: Pattern; }): WsIncoming<T> {
        return new WsIncoming<T>(packet);
    }
}


export class WsClientIncoming<T, TStatus = null> extends ClientIncomingPacket<T, TStatus> {

    clone(): WsClientIncoming<T, TStatus>;
    clone<V>(update: ClientIncomingCloneOpts<V, TStatus>): WsClientIncoming<V, TStatus>;
    clone(update: ClientIncomingCloneOpts<T, TStatus>): WsClientIncoming<T, TStatus>;
    clone(update: ClientIncomingCloneOpts<any, TStatus> = {}): WsClientIncoming<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new WsClientIncoming(opts);
    }
}

@Injectable()
export class WsClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any> & { pattern: Pattern }): WsClientIncoming<T> {
        return new WsClientIncoming(options);
    }

}