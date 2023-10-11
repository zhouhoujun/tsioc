import { Packet } from '@tsdi/common';
import { TransportContext, TransportEndpoint } from '@tsdi/transport';
import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class KafkaEndpoint extends TransportEndpoint<TransportContext, Packet> {

}
