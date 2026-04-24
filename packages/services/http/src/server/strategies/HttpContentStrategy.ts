import { Injectable } from '@tsdi/ioc';
import { RequestContext, Outgoing, FileStats, IStats, FindOptions } from '@tsdi/common';
import { IContentStrategy, CONTENT_STRATEGY } from '@tsdi/endpoints';
import { ContentOptions } from '@tsdi/endpoints/interceptors/content';

/**
 * HTTP content strategy.
 * HTTP 内容策略，实现 IContentStrategy 接口
 * Handles serving static content for HTTP server.
 */
@Injectable()
export class HttpContentStrategy implements IContentStrategy {

    /**
     * Send static content via HTTP response.
     * 通过HTTP响应发送静态内容
     */
    async sendStatic(
        context: RequestContext,
        path: string,
        options: ContentOptions
    ): Promise<void> {
        // HTTP static content is handled by the HTTP server's static file middleware
        // This strategy provides a protocol-specific hook for customization
        const response = context.response as any;
        
        // Set content headers
        if (options.contentType) {
            context.setHeader('Content-Type', options.contentType);
        }
        if (options.maxAge) {
            context.setHeader('Cache-Control', `public, max-age=${options.maxAge}`);
        }
        
        // The actual file serving is delegated to the underlying HTTP infrastructure
        // This allows integration with express.static, koa-static, etc.
    }

    /**
     * Find file matching the path.
     * 查找匹配路径的文件
     */
    async find(
        path: string,
        options: FindOptions
    ): Promise<FileStats<IStats> | null> {
        // File finding logic would be implemented by the HTTP server's file adapter
        // This returns null by default, allowing the server's default behavior
        return null;
    }

    /**
     * Check if this path should be handled as static content.
     * 检查此路径是否应作为静态内容处理
     */
    shouldHandle(path: string, context: RequestContext): boolean {
        // Check if the request is for a static file based on extension
        const staticExtensions = ['.js', '.css', '.html', '.png', '.jpg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
        return staticExtensions.some(ext => path.endsWith(ext));
    }
}

/** Token export for DI */
export const HttpContentStrategyToken = CONTENT_STRATEGY;