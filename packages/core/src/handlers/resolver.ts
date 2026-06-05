import { ResolveInterceptorLike, Parameter, TypeOf, Token, getTokenOf, ResolveHandler, ResolveInterceptorFn, getType, isResolved, invokeTail, TokenOf, isNil, isObject } from '@tsdi/ioc';
import { PipeTransform } from '../pipes/pipe';


export type ParameterScope = 'headers' | 'query' | 'path' | 'payload' | 'body' | 'topic';
/**
 * transport parameter argument.
 */
export interface TransportParameter<T = object> extends Parameter<T> {

    /**
     * field of request query params or body.
     */
    field?: string;
    /**
     * pipe
     */
    pipe?: string | TokenOf<PipeTransform>;
    /**
     * pipe extends args
     */
    args?: any[];
    /**
     * field scope.
     */
    scope?: ParameterScope;

    /**
     * custom resolver to resolve the value for the property or parameter.
     */
    resolver?: TokenOf<ResolveInterceptorLike<TransportParameter>>[];
}



/**
 * get transport argument resolve handler token.
 * @param type 
 * @returns 
 */
export function getResolveHandlerToken(type: TypeOf<any>, propertyKey?: string): Token<ResolveHandler> {
    return getTokenOf(type, 'RESOLVE_HANDLER', propertyKey);
}

export interface ReadResult<T = any> {
    success: boolean;
    value: T;
}
export abstract class MessageValueReader {
    abstract read(name: string | undefined, payload: any, section?: string): ReadResult;
}

/**
 * Default MessageValueReader that reads from context.getPayload().
 * Used in core-only mode. Microservices override with ServiceMessageValueReader.
 */
export class DefaultMessageValueReader extends MessageValueReader {
    read(name: string | undefined, payload: any, section?: string): ReadResult {
        if (isNil(payload) || !section) {
            return { success: false, value: undefined };
        }
        // For scalar payloads (string, number, etc.), return directly.
        if (!isObject(payload)) {
            return { success: true, value: payload };
        }
        const scopeVal = section === 'path'
            ? (payload.paths ?? payload.path)
            : section === 'query'
                ? (payload.query ?? payload.params)
                : section === 'payload'
                    ? (payload.payload ?? payload.body)
                    : section === 'body'
                        ? (payload.body ?? payload.payload)
                        : payload[section];
        if (isNil(scopeVal)) {
            return { success: false, value: undefined };
        }
        const value = name ? scopeVal[name] : scopeVal;
        if (!name) {
            return { success: true, value: scopeVal };
        }
        if (!isNil(value)) {
            return { success: true, value };
        }
        // For body scope, fall back to whole section (@RequestBody() shorthand).
        if (section === 'body') {
            return { success: true, value: scopeVal };
        }
        // Name specified but not found in object scope → failure.
        if (isObject(scopeVal)) {
            return { success: false, value: undefined };
        }
        // Scalar scopeVal → return as-is.
        return { success: true, value: scopeVal };
    }
}

export const typeResolveInterceptor: ResolveInterceptorFn = (input: TransportParameter, next, context) => {
    if (input.scope) {
        return next(input, context);
    }
    const payload = context.getPayload();
    if (payload) {
        const payloadType = getType(payload);
        if (!input.multi && (input.provider === payloadType || (!input.provider && input.type === payloadType))) {
            return payload;
        }
        const token = getResolveHandlerToken(payloadType);
        const hanlder = context.getInjector().get(token, null);
        if (hanlder) {
            return invokeTail(() => hanlder.handle(input, context), (res) => {
                if (isResolved(res)) return res;

                return next(input, context)
            })
        }


    }
    return next(input, context);
}