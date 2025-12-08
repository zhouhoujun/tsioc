import { Module } from '@tsdi/ioc';
import { PacketNumberIdGenerator } from './PacketId';
import { DefaultHeaderAdapter } from './headers';
import { TopicClientIncomingFactory, TopicIncomingFactory, UrlClientIncomingFactory, UrlIncomingFactory } from './Incoming';
import { TopicOutgoingFactory, UrlOutgoingFactory } from './Outgoing';

@Module({
    providers: [
        UrlClientIncomingFactory,
        TopicClientIncomingFactory,
        UrlOutgoingFactory,
        UrlIncomingFactory,
        TopicOutgoingFactory,
        TopicIncomingFactory,
        PacketNumberIdGenerator,
        DefaultHeaderAdapter,
    ]
})
export class TransportPacketModule {

}
