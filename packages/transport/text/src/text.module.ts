import { Module } from '@tsdi/ioc';
import { TextInterceptor } from './interceptor';
import { DefaultTextHandler } from './handler';
import { DefaultTextClient } from './client';
import { DefaultTextServer } from './server';

/**
 * TextTransport模块
 * 提供简单文本数据的传输能力
 *
 * 最简单的数据处理模块，适用于:
 * - 简单文本通信
 * - 日志传输
 * - 命令行交互
 */
@Module({
    providers: [
        TextInterceptor,
        DefaultTextHandler,
        DefaultTextClient,
        DefaultTextServer
    ]
})
export class TextTransportModule {

}