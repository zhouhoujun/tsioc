import { Injectable } from '@tsdi/ioc';
import { ClientIncomingCloneOpts, ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, IncomingCloneOpts, IncomingFactory, IncomingOpts, IncomingPacket } from '@tsdi/common/transport';



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


export class MqttClientIncoming<T, TStatus = null> extends ClientIncomingPacket<T, TStatus> {

    clone(): MqttClientIncoming<T, TStatus>;
    clone<V>(update: ClientIncomingCloneOpts<V, TStatus>): MqttClientIncoming<V, TStatus>;
    clone(update: ClientIncomingCloneOpts<T, TStatus>): MqttClientIncoming<T, TStatus>;
    clone(update: ClientIncomingCloneOpts<any, TStatus> = {}): MqttClientIncoming<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new MqttClientIncoming(opts);
    }
}

@Injectable()
export class MqttClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any>): MqttClientIncoming<T> {
        return new MqttClientIncoming(options);
    }

}