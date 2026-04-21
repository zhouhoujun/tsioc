import { Module } from '@tsdi/ioc';
import { PacketInterceptor } from './interceptor';
import { HeaderPacketCodec } from './codec';
import { DefaultPacketHandler } from './handler';
import { DefaultPacketClient } from './client';
import { DefaultPacketServer } from './server';

/**
 * PacketTransport模块
 * 提供带HTTP-like Headers的数据包传输能力
 *
 * 适用于:
 * - 带元数据的消息传输
 * - 请求-响应模式
 * - 消息追踪和关联
 */
@Module({
    providers: [
        HeaderPacketCodec,
        PacketInterceptor,
        DefaultPacketHandler,
        DefaultPacketClient,
        DefaultPacketServer
    ]
})
export class PacketTransportModule {

}