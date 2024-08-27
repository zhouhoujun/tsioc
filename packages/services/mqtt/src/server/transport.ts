import { Injectable } from '@tsdi/ioc';
import {
    IncomingFactory, TopicIncoming,
    AbstractOutgoing, OutgoingCloneOpts, OutgoingFactory, Incoming, OutgoingOpts,
    TopicClientIncomingCloneOpts, TopicIncomingOptions
} from '@tsdi/common/transport';



export class MqttIncoming<T> extends TopicIncoming<T> {

    clone(): MqttIncoming<T>;
    clone<V>(update: TopicClientIncomingCloneOpts<V>): MqttIncoming<V>;
    clone(update: TopicClientIncomingCloneOpts<T>): MqttIncoming<T>;
    clone(update: TopicClientIncomingCloneOpts<any> = {}): MqttIncoming<any> {
        const opts = this.cloneOpts(update);
        return new MqttIncoming(opts);

    }

}

@Injectable()
export class MqttIncomingFactory implements IncomingFactory {
    create<T>(packet: TopicIncomingOptions<T>): MqttIncoming<T> {
        return new MqttIncoming<T>(packet);
    }
}


export class MqttOutgoing<T, TStatus = null> extends AbstractOutgoing<T, TStatus> {

    clone(): MqttOutgoing<T, TStatus>;
    clone<V>(update: OutgoingCloneOpts<V, TStatus>): MqttOutgoing<V, TStatus>;
    clone(update: OutgoingCloneOpts<T, TStatus>): MqttOutgoing<T, TStatus>;
    clone(update: any = {}): MqttOutgoing<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new MqttOutgoing(opts);
    }

}


export class MqttOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingOpts<T, null>): MqttOutgoing<T> {
        return new MqttOutgoing({ id: incoming.id, pattern: incoming.pattern, ...options });
    }

}