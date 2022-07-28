import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Readable, Writable } from 'stream';

@Abstract()
export abstract class PacketTransform<T = any> {
    abstract read(readable: Readable): Observable<T>;
    abstract write(writable: Writable, packet: T, encoding?: BufferEncoding): Promise<void>;
}
