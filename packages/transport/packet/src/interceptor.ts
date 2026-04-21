import { Injectable } from '@tsdi/ioc';
import { RequestContext } from '@tsdi/common';
import { MessageType, HeaderPacket, createHeaderPacket } from '@tsdi/common';
import { Observable, from, map, mergeMap } from 'rxjs';
import { HeaderPacketCodec, PACKET_CODEC_OPTIONS } from './codec';

/**
 * PacketInterceptor - HeaderPacket请求拦截器
 * 处理带HTTP-like Headers的数据包
 */
@Injectable()
export class PacketInterceptor {

    constructor(protected codec: HeaderPacketCodec) {}

    /**
     * 拦截处理
     */
    intercept(input: Buffer, next: (packet: HeaderPacket) => Observable<HeaderPacket>, context: RequestContext): Observable<HeaderPacket> {
        return from(this.processInput(input, context))
            .pipe(
                mergeMap(packet => next(packet)),
                map(res => this.processOutput(res, context))
            );
    }

    /**
     * 处理输入数据 - 解码Buffer为HeaderPacket
     */
    protected async processInput(input: Buffer, context: RequestContext): Promise<HeaderPacket> {
        return this.codec.decode(input, context);
    }

    /**
     * 处理输出数据 - 编码HeaderPacket为Buffer
     */
    protected processOutput(packet: HeaderPacket, context: RequestContext): HeaderPacket {
        if (packet && packet.type === MessageType.PACKET) {
            return packet;
        }

        // 如果不是HeaderPacket，创建一个默认的
        return createHeaderPacket(
            '',
            packet,
            Buffer.byteLength(JSON.stringify(packet)),
            {}
        );
    }
}