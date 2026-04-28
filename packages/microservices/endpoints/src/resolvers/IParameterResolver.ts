import { Abstract } from '@tsdi/ioc';
import { AbstractRequestContext } from '../AbstractRequestContext';

/**
 * Parameter resolver strategy interface.
 * Defines how controller method parameters are resolved for different protocols.
 * 参数解析策略接口，定义不同协议的控制器方法参数解析方式
 */
@Abstract()
export abstract class IParameterResolver {

    /**
     * Resolve body parameter.
     * 解析body参数
     * @param context - AbstractRequestContext
     * @param field - Optional field name within body
     */
    abstract resolveBody(context: AbstractRequestContext, field?: string): any;

    /**
     * Resolve header parameter.
     * 解析header参数
     * @param context - AbstractRequestContext
     * @param field - Header field name
     */
    abstract resolveHeader(context: AbstractRequestContext, field: string): string | undefined;

    /**
     * Resolve query parameter.
     * 解析query参数
     * @param context - AbstractRequestContext
     * @param key - Query key
     */
    abstract resolveQuery(context: AbstractRequestContext, key: string): string | string[] | undefined;

    /**
     * Resolve path parameter.
     * 解析path参数
     * @param context - AbstractRequestContext
     * @param key - Path parameter key
     */
    abstract resolveParams(context: AbstractRequestContext, key: string): string | undefined;

    /**
     * Resolve payload parameter.
     * 解析payload参数
     * @param context - AbstractRequestContext
     */
    abstract resolvePayload(context: AbstractRequestContext): any;
}

/**
 * Parameter resolver token.
 * 参数解析器令牌
 */
export const PARAMETER_RESOLVER = 'PARAMETER_RESOLVER';