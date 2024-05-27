// import { HeadersLike, Pattern } from '@tsdi/common';
// import { IReadableStream } from './stream';

import { HeaderMappings } from "@tsdi/common/src";


// /**
//  * packet data.
//  */
// export interface HeaderPacket {
//     id?: any;
//     type?: number | string;
//     pattern?: Pattern;
//     url?: string;
//     topic?: string;
//     method?: string;
//     headers?: HeadersLike;
// }

// /**
//  * packet data.
//  */
// export interface Packet<T = any> extends HeaderPacket {
//     payload?: T;
//     error?: any;
// }

// export interface PacketData<T = any> {
//     headerBuffer?: Buffer;
//     headerLength?: number;
//     headers: TransportHeaders;
//     payload: T | null;

//     /**
//      * payload length.
//      */
//     payloadLength?: number | null;
//     streamLength?: number;
// }

// export interface Message {
//     id?: any;
//     type?: number | string;
//     header?: Buffer;
//     headerLength: number;
//     payload?: Buffer | IReadableStream;
//     payloadLenght: number;
// }


// /**
//  * response packet data.
//  */
// export interface ResponsePacket<T = any, TStatus= any> extends Packet<T> {
//     type?: number | string;
//     status?: TStatus;
//     statusMessage?: string;
//     ok?: boolean;
//     error?: any;
// }

