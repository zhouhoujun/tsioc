import { Injectable } from '@tsdi/ioc';
import {
    IncomingCloneOpts, IncomingFactory, IncomingOpts, IncomingPacket,
    OutgoingPacket, OutgoingCloneOpts, OutgoingFactory, Incoming, OutgoingPacketOpts
} from '@tsdi/common/transport';



export class MqttIncoming<T> extends IncomingPacket<T> {

    clone(): MqttIncoming<T>;
    clone<V>(update: IncomingCloneOpts<V>): MqttIncoming<V>;
    clone(update: IncomingCloneOpts<T>): MqttIncoming<T>;
    clone(update: IncomingCloneOpts<any> = {}): MqttIncoming<any> {
        const opts = this.cloneOpts(update);
        return new MqttIncoming(opts);

    }

}

@Injectable()
export class MqttIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T>): MqttIncoming<T> {
        return new MqttIncoming<T>(packet);
    }
}


export class MqttOutgoing<T, TStatus = null> extends OutgoingPacket<T, TStatus> {

    clone(): MqttOutgoing<T, TStatus>;
    clone<V>(update: OutgoingCloneOpts<V, TStatus>): MqttOutgoing<V, TStatus>;
    clone(update: OutgoingCloneOpts<T, TStatus>): MqttOutgoing<T, TStatus>;
    clone(update: any = {}): MqttOutgoing<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new MqttOutgoing(opts);
    }

}


export class MqttOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, null>): MqttOutgoing<T> {
        return new MqttOutgoing({ id: incoming.id, pattern: incoming.pattern, ...options });
    }

}