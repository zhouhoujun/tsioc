import { Abstract } from '@tsdi/ioc';
import { RequestContext, Outgoing, FileStats, IStats, FindOptions } from '@tsdi/common';
import { ContentOptions } from '../interceptors/content';

/**
 * Content strategy interface.
 * Defines how static content is served for different protocols.
 * 内容策略接口，定义不同协议的静态内容服务方式
 */
@Abstract()
export abstract class IContentStrategy {

    /**
     * Send static content.
     * 发送静态内容
     * @param context - RequestContext
     * @param path - File path
     * @param options - Content options
     */
    abstract sendStatic(
        context: RequestContext,
        path: string,
        options: ContentOptions
    ): Promise<void>;

    /**
     * Find file matching the path.
     * 查找匹配路径的文件
     * @param path - Path to find
     * @param options - Find options
     */
    abstract find(
        path: string, 
        options: FindOptions
    ): Promise<FileStats<IStats> | null>;

    /**
     * Check if this path should be handled as static content.
     * 检查此路径是否应作为静态内容处理
     * @param path - Path to check
     * @param context - RequestContext
     */
    abstract shouldHandle(path: string, context: RequestContext): boolean;
}

/**
 * Content strategy token.
 * 内容策略令牌
 */
export const CONTENT_STRATEGY = 'CONTENT_STRATEGY';