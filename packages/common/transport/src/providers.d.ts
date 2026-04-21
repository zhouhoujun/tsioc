import { PacketIdGenerator, RequestContext, TransferInterceptorFactory, TransferOptions } from '@tsdi/common';
import { ProvdierOf } from '@tsdi/ioc';
export interface PacketOptions extends TransferOptions {
    /**
     * packet id generator.
     */
    packetId?: ProvdierOf<PacketIdGenerator>;
    /**
     * parse value to simple mapping json.
     * @param value
     * @returns
     */
    mapping?: (value: any, context: RequestContext) => any;
    reviver?: (this: any, key: string, value: any) => any;
    replacer?: ((this: any, key: string, value: any) => any);
    space?: string | number;
}
export declare function useJsonPacket(options?: PacketOptions): TransferInterceptorFactory;
