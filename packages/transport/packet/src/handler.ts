import { Injectable, Abstract } from '@tsdi/ioc';
import { RequestContext, Pattern } from '@tsdi/common';
import { HeaderPacket, createHeaderPacket, PacketHeader, MessageType } from '@tsdi/common';
import { Observable, of } from 'rxjs';

/**
 * PacketRequestOptions - Packet请求选项
 */
export interface PacketRequestOptions<T = any> {
    /**
     * 请求模式
     */
    pattern?: Pattern;

    /**
     * payload数据
     */
    payload: T;

    /**
     * HTTP-like Headers
     */
    headers?: PacketHeader;

    /**
     * 消息ID
     */
    id?: string | number;
}

/**
 * PacketRequest - Packet请求类
 */
export class PacketRequest<T = any> {
    readonly pattern: Pattern | null = null;
    readonly payload: T;
    readonly headers: PacketHeader = {};
    readonly id?: string | number;

    constructor(options: PacketRequestOptions<T>) {
        this.pattern = options.pattern ?? null;
        this.payload = options.payload;
        this.headers = options.headers ?? {};
        this.id = options.id;
    }

    /**
     * 转换为HeaderPacket
     */
    toPacket(): HeaderPacket<T> {
        return createHeaderPacket(
            this.id ?? '',
            this.payload,
            Buffer.byteLength(JSON.stringify(this.payload)),
            this.headers
        );
    }
}

/**
 * PacketResponse - Packet响应类
 */
export class PacketResponse<T = any> {
    readonly packet: HeaderPacket<T>;
    readonly status: number = 200;
    readonly statusText: string = 'OK';

    constructor(packet: HeaderPacket<T>, status?: number, statusText?: string) {
        this.packet = packet;
        this.status = status ?? 200;
        this.statusText = statusText ?? 'OK';
    }

    /**
     * 获取响应payload
     */
    get payload(): T {
        return this.packet.payload;
    }

    /**
     * 获取headers
     */
    get headers(): PacketHeader {
        return this.packet.headers ?? {};
    }

    /**
     * 是否成功
     */
    get ok(): boolean {
        return this.status >= 200 && this.status < 300;
    }
}

/**
 * PacketHandler - Packet请求处理器接口
 */
@Abstract()
export abstract class PacketHandler {
    abstract handle<T>(input: HeaderPacket<T> | PacketRequest<T>, context: RequestContext): Observable<PacketResponse<any>>;
}

/**
 * DefaultPacketHandler - 默认处理器实现
 */
@Injectable()
export class DefaultPacketHandler implements PacketHandler {
    handle<T>(input: HeaderPacket<T> | PacketRequest<T>, context: RequestContext): Observable<PacketResponse<any>> {
        const packet = input instanceof PacketRequest ? input.toPacket() : input;
        return of(new PacketResponse(packet as HeaderPacket<any>));
    }
}