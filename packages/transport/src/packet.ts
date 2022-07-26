import { Packet } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportStream } from './stream';

@Abstract()
export abstract class PacketTransform {
    abstract read(socket: TransportStream): Observable<Packet>;
    abstract write(socket: TransportStream, data: Packet, encoding?: BufferEncoding): Promise<void>;
}
