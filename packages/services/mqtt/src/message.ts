import { Injectable } from '@tsdi/ioc';
import { MessageFactory, TopicMesage } from '@tsdi/common';
import { AbstractTransportSession, ev, IEventEmitter, IReadableStream, MessageReader, MessageWriter } from '@tsdi/common/transport';
import { fromEvent, Observable } from 'rxjs';
import { IPublishPacket, MqttClient } from 'mqtt';


export class MqttMessage extends TopicMesage {

}

@Injectable()
export class MqttMessageFactory implements MessageFactory {


    create(initOpts: {
        id?: string | number;
        topic?: string;
        responseTopic?: string;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: Buffer | IReadableStream | null;

    }): MqttMessage {
        return new MqttMessage(initOpts.topic!, initOpts.responseTopic, initOpts);
    }

}

@Injectable()
export class SocketMessageReader implements MessageReader<MqttClient> {
    read(mqtt: MqttClient, channel: IEventEmitter, session: AbstractTransportSession): Observable<MqttMessage> {
        return fromEvent(mqtt, ev.MESSAGE, (topic: string, payload: Buffer, packet: IPublishPacket) => {
            if (!session.messageFactory) return new MqttMessage({ topic, payload })
            return session.messageFactory.create({ topic, payload });
        })
    }
}

@Injectable()
export class SocketMessageWriter implements MessageWriter<MqttClient> {
    write(socket: MqttClient, channel: IEventEmitter, msg: MqttMessage, origin: any, session: AbstractTransportSession): Promise<void> {
        if (session.streamAdapter.isReadable(msg.data)) {
            return session.streamAdapter.pipeTo(msg.data as IReadableStream, socket, { end: false });
        }
        return promisify<any, void>(socket.write, socket)(msg.data)
    }
}