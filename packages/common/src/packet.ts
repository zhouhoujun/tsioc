import { promisify } from '@tsdi/ioc';
import { IHeaders } from './headers';
import { IReadable, IWritable } from './stream';
import { StreamAdapter } from './StreamAdapter';


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


export function writePacket(socket: IWritable, msg: Packet, streamAdapter: StreamAdapter): Promise<void> {
    if (streamAdapter.isReadable(msg.payload)) {
        return streamAdapter.pipeTo(msg.payload as IReadable, socket, { end: false });
    }
    return promisify<any, void>(socket.write, socket)(msg.payload)
}
