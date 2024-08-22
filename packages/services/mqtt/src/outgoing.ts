import { Incoming, OutgoingCloneOpts, OutgoingFactory, OutgoingPacket, OutgoingPacketOpts } from '@tsdi/common/transport';


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