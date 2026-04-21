import { Module } from '@tsdi/ioc';
import { StreamInterceptor } from './interceptor';
import { HeaderStreamCodec } from './codec';
import { DefaultStreamHandler } from './handler';
import { DefaultStreamClient } from './client';
import { DefaultStreamServer } from './server';

/**
 * StreamTransport模块
 * 提供带HTTP-like Headers的流数据传输能力
 *
 * 适用于:
 * - 大文件传输
 * - 视频流、音频流
 * - 实时数据流
 * - WebSocket数据流
 */
@Module({
    providers: [
        HeaderStreamCodec,
        StreamInterceptor,
        DefaultStreamHandler,
        DefaultStreamClient,
        DefaultStreamServer
    ]
})
export class StreamTransportModule {

}