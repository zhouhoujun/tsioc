export * from './handler';
export * from './codec';

import { Injectable, Injector, Abstract } from '@tsdi/ioc';
import { createRequestContext, Pattern, RequestContext } from '@tsdi/common';
import { HeaderPacket, createHeaderPacket, PacketHeader } from '@tsdi/common';
import { Observable, map, catchError, throwError } from 'rxjs';
import { PacketHandler, PacketRequest, PacketResponse } from './handler';
import { HeaderPacketCodec } from './codec';

/**
 * PacketClient - 带HTTP-like Headers的数据包客户端
 */
@Abstract()
export abstract class PacketClient {
    protected abstract get injector(): Injector;
    protected abstract get handler(): PacketHandler;
    protected abstract get codec(): HeaderPacketCodec;

    /**
     * 发送HeaderPacket
     */
    send<T>(packet: HeaderPacket<T>): Observable<PacketResponse>;

    /**
     * 发送数据到指定模式，带自定义headers
     */
    send<T>(pattern: Pattern, payload: T, headers?: PacketHeader): Observable<PacketResponse>;

    /**
     * 发送PacketRequest
     */
    send<T>(request: PacketRequest<T>): Observable<PacketResponse>;

    send<T>(first: HeaderPacket<T> | Pattern | PacketRequest<T>, second?: T, third?: PacketHeader): Observable<PacketResponse> {
        let packet: HeaderPacket<any>;
        const context = createRequestContext(this.injector);

        if (first instanceof PacketRequest) {
            packet = first.toPacket();
        } else if (typeof first === 'object' && first !== null && 'type' in first && first.type === 'packet') {
            packet = first as HeaderPacket<T>;
        } else if (second !== undefined) {
            // send(pattern, payload, headers)
            const headers = third ?? {};
            if (typeof first === 'string' || typeof first === 'object') {
                headers['pattern'] = typeof first === 'string' ? first : JSON.stringify(first);
            }
            packet = createHeaderPacket(
                '',
                second,
                Buffer.byteLength(JSON.stringify(second)),
                headers
            );
        } else {
            return throwError(() => new Error('Invalid arguments for PacketClient.send'));
        }

        return this.handler.handle(packet, context)
            .pipe(
                catchError(err => throwError(() => this.onError(err)))
            );
    }

    /**
     * 错误处理
     */
    protected onError(err: Error): Error {
        return err;
    }
}

/**
 * DefaultPacketClient - 默认客户端实现
 */
@Injectable()
export class DefaultPacketClient extends PacketClient {
    constructor(
        protected injector: Injector,
        protected handler: PacketHandler,
        protected codec: HeaderPacketCodec
    ) {
        super();
    }
}