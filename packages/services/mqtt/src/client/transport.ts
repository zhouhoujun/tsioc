import { Injectable } from '@tsdi/ioc';
import { ClientIncomingCloneOpts, ClientIncomingFactory, ClientIncomingOpts, AbstractClientIncoming } from '@tsdi/common/transport';



export class MqttClientIncoming<T, TStatus = null> extends AbstractClientIncoming<T, TStatus> {

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