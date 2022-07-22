import { Abstract } from '@tsdi/ioc';
import { Packet, Protocol, Redirector, TransportStatus } from '@tsdi/core';
import { Observable } from 'rxjs';
import { Readable, Writable } from 'stream';
import { TransportRequest } from './client';

/**
 * transport protocol.
 */
@Abstract()
export abstract class TransportProtocol {
    
    abstract connect(): Promise<void>;
    
    abstract get redirector(): Redirector;
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
    abstract normlizeUrl(req: TransportRequest<any>): string;
    abstract isAbsoluteUrl(url: string): boolean;
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
