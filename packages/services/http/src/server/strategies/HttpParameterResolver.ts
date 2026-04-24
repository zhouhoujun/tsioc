import { Injectable } from '@tsdi/ioc';
import { AbstractRequestContext } from '@tsdi/common';
import { IParameterResolver, PARAMETER_RESOLVER } from '@tsdi/endpoints';

/**
 * HTTP parameter resolver.
 * HTTP 参数解析器，实现 IParameterResolver 接口
 * Resolves controller method parameters from HTTP request.
 */
@Injectable()
export class HttpParameterResolver implements IParameterResolver {

    /**
     * Resolve body parameter.
     * 解析body参数
     */
    resolveBody(context: AbstractRequestContext, field?: string): any {
        const request = context.request as any;
        const body = request.body ?? context.body;
        
        if (field) {
            return body?.[field];
        }
        return body;
    }

    /**
     * Resolve header parameter.
     * 解析header参数
     */
    resolveHeader(context: AbstractRequestContext, field: string): string | undefined {
        const request = context.request as any;
        return request.headers?.[field.toLowerCase()] as string | undefined;
    }

    /**
     * Resolve query parameter.
     * 解析query参数
     */
    resolveQuery(context: AbstractRequestContext, key: string): string | string[] | undefined {
        const request = context.request as any;
        const query = request.query ?? context.query;
        return query?.[key];
    }

    /**
     * Resolve path parameter.
     * 解析path参数
     */
    resolveParams(context: AbstractRequestContext, key: string): string | undefined {
        const request = context.request as any;
        const params = request.params ?? context.params;
        return params?.[key];
    }

    /**
     * Resolve payload parameter.
     * 解析payload参数
     */
    resolvePayload(context: AbstractRequestContext): any {
        const request = context.request as any;
        // For HTTP, payload is typically the body
        return request.body ?? context.body ?? request.payload;
    }
}

export const HttpParameterResolverToken = PARAMETER_RESOLVER;