import { Injectable } from '@tsdi/ioc';
import {
    ClientIncomingCloneOpts, ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket,
    IncomingCloneOpts, IncomingFactory, IncomingOpts, IncomingPacket
} from '@tsdi/common/transport';



export class TcpIncoming<T> extends IncomingPacket<T> {

    clone(): TcpIncoming<T>;
    clone<V>(update: IncomingCloneOpts<V>): TcpIncoming<V>;
    clone(update: IncomingCloneOpts<T>): TcpIncoming<T>;
    clone(update: IncomingCloneOpts<any> = {}): TcpIncoming<any> {
        const opts = this.cloneOpts(update);
        return new TcpIncoming(opts);

    }

}

@Injectable()
export class TcpIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T>): TcpIncoming<T> {
        return new TcpIncoming<T>(packet);
    }
}


export class TcpClientIncoming<T, TStatus = null> extends ClientIncomingPacket<T, TStatus> {

    clone(): ClientIncomingPacket<T, TStatus>;
    clone<V>(update: ClientIncomingCloneOpts<V, TStatus>): TcpClientIncoming<V, TStatus>;
    clone(update: ClientIncomingCloneOpts<T, TStatus>): TcpClientIncoming<T, TStatus>;
    clone(update: ClientIncomingCloneOpts<any, TStatus> = {}): TcpClientIncoming<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new TcpClientIncoming(opts);
    }
}

@Injectable()
export class TcpClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any>): TcpClientIncoming<T> {
        return new TcpClientIncoming(options);
    }

}