import { Abstract } from '@tsdi/ioc';
import { RequestContext, IStream, ContentType } from '@tsdi/common';

/**
 * Body serialize strategy interface.
 * Defines how request bodies are serialized for different protocols.
 * 请求体序列化策略接口，定义不同协议的请求体序列化方式
 */
@Abstract()
export abstract class IBodySerializeStrategy {

    /**
     * Serialize the body for transmission.
     * 序列化请求体用于传输
     * @param body - The body content to serialize
     * @param context - RequestContext for adapters
     * @returns Serialized body (ArrayBuffer, Buffer, Blob, FormData, string, Stream, or null)
     */
    abstract serialize(
        body: any, 
        context: RequestContext
    ): ArrayBuffer | IStream | Buffer | Blob | FormData | string | null;

    /**
     * Detect content type from body.
     * 根据请求体检测内容类型
     * @param body - The body content
     * @returns Content type string or null if cannot detect
     */
    abstract detectContentType(body: any): string | null;

    /**
     * Check if this strategy can handle the given body type.
     * 检查此策略是否可以处理给定的请求体类型
     * @param body - The body to check
     */
    abstract canHandle(body: any): boolean;
}

/**
 * Body serialize strategy token.
 * 请求体序列化策略令牌
 */
export const BODY_SERIALIZE_STRATEGY = 'BODY_SERIALIZE_STRATEGY';