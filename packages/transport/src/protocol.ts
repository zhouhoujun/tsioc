import { Abstract } from '@tsdi/ioc';
import { Packet, Protocol } from '@tsdi/core';
import { Observable } from 'rxjs';
import { Readable, Writable } from 'stream';

/**
 * transport protocol .
 */
@Abstract()
export abstract class TransportProtocol extends Protocol {

    /**
     * connect
     */
    abstract connect(options: Record<string, any>): Promise<void>;

    /**
     * read stream
     * @param stream 
     * @param encoding  
     */
    abstract read(stream: Readable, encoding?: BufferEncoding): Observable<Packet>;
    /**
     * write stream
     * @param stream 
     * @param data 
     * @param encoding 
     */
    abstract write(stream: Writable, data: any, encoding?: BufferEncoding): Observable<Packet>;
}


