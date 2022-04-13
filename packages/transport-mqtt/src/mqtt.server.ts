import { Protocol, RequestPacket, TransportHandler, TransportServer, ResponsePacket } from '@tsdi/core';

export class MQTTServer extends TransportServer {

    get protocol(): Protocol {
        throw new Error('Method not implemented.');
    }

    get handler(): TransportHandler<RequestPacket<any>, ResponsePacket<any>> {
        throw new Error('Method not implemented.');
    }

    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
