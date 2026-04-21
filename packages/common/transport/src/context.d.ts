import { ContextToken } from '@tsdi/ioc';
import { Socket } from './socket';
export declare const TEXT_DECODER: ContextToken<TextDecoder>;
export declare const PACKET_DELIMITER: ContextToken<string>;
export declare const PACKET_MAXSIZE: ContextToken<number>;
export declare const PACKET_LENGTH: ContextToken<number>;
export declare const PACKET_LIMIT: ContextToken<number>;
export declare const PACKET_IDLEN: ContextToken<number>;
export declare const SOCKET: import("@tsdi/ioc").InjectToken<Socket>;
