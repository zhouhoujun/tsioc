import { Module } from '@tsdi/ioc';
import { JsonInterceptor } from './interceptor';
import { DefaultJsonHandler } from './handler';
import { DefaultJsonClient } from './client';
import { DefaultJsonServer } from './server';

/**
 * JsonTransport模块
 * 提供结构化JSON数据的传输能力
 *
 * 适用于:
 * - 结构化数据通信
 * - API请求/响应
 * - 配置传输
 */
@Module({
    providers: [
        JsonInterceptor,
        DefaultJsonHandler,
        DefaultJsonClient,
        DefaultJsonServer
    ]
})
export class JsonTransportModule {

}