import { IHeaders } from './headers';
import { IWritable } from './stream';
import { PipeSource, StreamAdapter } from './StreamAdapter';
export interface Packet<T = any> {
    /**
     * packet id
     */
    id?: string | number;
    /**
     * topic
     */
    topic?: string;
    /**
     * properties
     */
    properties?: Record<string, any>;
    /**
     * packet headers.
     */
    headers?: IHeaders;
    /**
     * packet
     */
    payload: T | null;
    /**
     * cache length
     */
    length?: number;
    /**
     * content lenght
     */
    contentLength?: number | null;
}
export declare function writePacket(socket: IWritable, msg: PipeSource, streamAdapter: StreamAdapter): Promise<void>;
