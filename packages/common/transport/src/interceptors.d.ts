import { RequestHandlerFn, RequestInterceptorFn, TransferConfig, TransferOptions } from '@tsdi/common';
import { Socket } from './socket';
export declare function packetIdMessage(config: TransferConfig, options: TransferOptions): RequestInterceptorFn;
export declare function createSendMessageBackend(eventName?: string, socket?: Socket): RequestHandlerFn;
export declare function socketMessage(config: TransferConfig, options: TransferOptions): RequestInterceptorFn;
export declare function delimiterPacket(config: TransferConfig, options: TransferOptions): RequestInterceptorFn;
export declare function delimiterUnpacket(config: TransferConfig, options: TransferOptions): RequestInterceptorFn;
