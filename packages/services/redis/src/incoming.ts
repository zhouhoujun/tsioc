import { Injectable } from '@tsdi/ioc';
import { ClientIncomingCloneOpts, ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, IncomingCloneOpts, IncomingFactory, IncomingOpts, IncomingPacket } from '@tsdi/common/transport';



export class RedisIncoming<T = any> extends IncomingPacket<T> {

    clone(): RedisIncoming<T>;
    clone<V>(update: IncomingCloneOpts<V>): RedisIncoming<V>;
    clone(update: IncomingCloneOpts<T>): RedisIncoming<T>;
    clone(update: any = {}): RedisIncoming {
        const opts = this.cloneOpts(update);
        return new RedisIncoming(opts);

    }

}

@Injectable()
export class RedisIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T>): RedisIncoming<T> {
        return new RedisIncoming<T>(packet);
    }
}


export class RedisClientIncoming<T, TStatus = any> extends ClientIncomingPacket<T, TStatus> {

    clone(): ClientIncomingPacket<T, TStatus>;
    clone<V>(update: ClientIncomingCloneOpts<V, TStatus>): RedisClientIncoming<V, TStatus>;
    clone(update: ClientIncomingCloneOpts<T, TStatus>): RedisClientIncoming<T, TStatus>;
    clone(update: any = {}): RedisClientIncoming<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new RedisClientIncoming(opts);
    }
}

@Injectable()
export class RedisClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any>): RedisClientIncoming<T> {
        return new RedisClientIncoming(options);
    }

}