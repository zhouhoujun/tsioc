import { IReadableStream } from '@tsdi/common/transport';
import { RemoteInfo } from 'dgram';


// export const defaultMaxSize = 61440; //1024 * 60;

export const defaultMaxSize = 65507

export interface UdpMessage {
    payload: Buffer | IReadableStream;
    topic: string;
    rinfo: RemoteInfo;
}



export const udptl = /^udp(s)?:\/\//i;