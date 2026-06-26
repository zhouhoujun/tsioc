import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import * as dgram from 'node:dgram';
import { UdpMessageAdapter } from './message-adapter';

@Injectable()
export class UdpMessageAdapterFactory extends MessageAdapterFactory<dgram.Socket, dgram.Socket, UdpMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<dgram.Socket, dgram.Socket>): UdpMessageAdapter {
        return new UdpMessageAdapter(options.request, options.response!);
    }
}
