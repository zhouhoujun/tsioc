import { ContextToken, ProvdierOf, Provider } from '@tsdi/ioc';
import { RequestInterceptorFn, RequestInterceptorLike } from './interceptor';
import { TransportConfig } from './protocols';
import { RequestContext } from './context';
export declare enum TransferSide {
    client = 1,
    server = 2
}
export declare enum TransferFeatureKind {
    UnPacket = 0,
    Decode = 1,
    Deserialize = 2,
    Serialize = 3,
    Encode = 4,
    Packet = 5
}
export interface TransferOptions {
    eventName?: string;
    delimiter?: string;
    maxSize?: number;
    limitSize?: number;
    idSize?: number;
    /**
     * packet with size.
     */
    size?: number;
}
export interface TransferConfig extends TransportConfig {
    side: TransferSide;
    transfer?: TransferOptions;
    providers?: Provider[];
}
export interface TransferFeature<Kind extends TransferFeatureKind> {
    kind: Kind;
    config?: TransferConfig;
    providers: Provider[];
}
export declare function makeTransferFeature<T extends TransferFeatureKind>(kind: T, providers: Provider[], config?: TransferConfig): TransferFeature<T>;
export interface TransferInterceptorFactory {
    (side: TransferConfig): ProvdierOf<RequestInterceptorLike> | ProvdierOf<RequestInterceptorLike>[];
}
export interface StringTransferOptions {
    type: 'string';
    codings?: string;
    /**
     * custom packet unpacket.
     */
    packet?: TransferOptions;
}
export interface JsonTransferOptions {
    type: 'json';
    payloadKey?: 'payload' | 'body';
    /**
     * custom packet unpacket.
     */
    packet?: TransferOptions;
}
export interface StreamTransferOptions {
    type: 'stream';
}
export type TransferFactoryOptions = StringTransferOptions | JsonTransferOptions | StreamTransferOptions | TransferInterceptorFactory[];
export declare const PAYLOAD_KEY: ContextToken<string>;
export declare const useCatch: RequestInterceptorFn;
export declare function useSimpleJson(options?: {
    /**
     * parse value to simple mapping json.
     * @param value
     * @returns
     */
    mapping?: (value: any, context: RequestContext) => any;
    reviver?: (this: any, key: string, value: any) => any;
    replacer?: ((this: any, key: string, value: any) => any);
    space?: string | number;
}): TransferInterceptorFactory;
