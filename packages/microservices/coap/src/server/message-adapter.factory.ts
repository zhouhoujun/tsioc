import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import * as coap from 'coap';
import { CoapMessageAdapter } from './message-adapter';

@Injectable()
export class CoapMessageAdapterFactory extends MessageAdapterFactory<Record<string, any>, coap.OutgoingMessage, CoapMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<Record<string, any>, coap.OutgoingMessage>): CoapMessageAdapter {
        return new CoapMessageAdapter(options.request, options.response);
    }
}
