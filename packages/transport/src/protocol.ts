import { Abstract } from '@tsdi/ioc';
import { Packet, Protocol, TransportStatus } from '@tsdi/core';
import { Observable } from 'rxjs';
import { Readable, Writable } from 'stream';

/**
 * transport protocol.
 */
@Abstract()
export abstract class TransportProtocol {
    /**
     * protocol name.
     */
    abstract get protocol(): Protocol;
    /**
     * status of transport.
     */
    abstract get status(): TransportStatus;
    /**
     * url parse.
     * @param url 
     */
    abstract parseURL(url: string): URL;
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
    abstract write(stream: Writable, data: Packet, encoding?: BufferEncoding): Observable<Packet>;
}
