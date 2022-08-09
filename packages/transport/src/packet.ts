import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Readable, Duplex } from 'stream';

@Abstract()
export abstract class ProtocolPacket<T = any> {
    abstract parse(buffer: Buffer, opts?: any): Observable<T>;
    abstract generate(packet: T): Observable<Buffer>;
    abstract write(writable: Duplex, packet: T, encoding?: BufferEncoding): Promise<void>;
}
