import { promisify } from '@tsdi/ioc';
import { IHeaders } from './headers';
import { IReadable, IWritable } from './stream';
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


export function writePacket(socket: IWritable, msg: PipeSource, streamAdapter: StreamAdapter): Promise<void> {
    if (streamAdapter.isReadable(msg)) {
        return streamAdapter.pipeTo(msg as IReadable, socket, { end: false });
    }
    if (typeof (socket as any)?.write === 'function') {
        return promisify<any, void>((socket as any).write, socket as any)(msg)
    }
    if (typeof (socket as any)?.send === 'function') {
        return new Promise<void>((resolve, reject) => {
            (socket as any).send(msg, (err?: Error | null) => err ? reject(err) : resolve());
        });
    }
    return Promise.reject(new Error('Socket does not support write or send'))
}
