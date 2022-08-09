import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Readable, Writable, Transform, Duplex } from 'stream';

@Abstract()
export abstract class ProtocolPacket<T = any> {
    abstract parse(opts?: any): Transform;
    abstract generate(stream: Readable, opts?: any): Writable;
    abstract write(writable: Duplex, packet: T, encoding?: BufferEncoding): Promise<void>;
}
