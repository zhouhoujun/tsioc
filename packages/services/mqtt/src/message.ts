import { Injectable } from '@tsdi/ioc';
import { MessageFactory, TopicMesage } from '@tsdi/common';
import { IReadableStream } from '@tsdi/common/transport';


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