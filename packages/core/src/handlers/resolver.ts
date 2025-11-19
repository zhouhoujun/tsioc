import { ResolveInterceptorLike, Parameter, TypeOf, Token, getTokenOf, ResolveHandler, ResolveInterceptorFn, getType, isResolved } from '@tsdi/ioc';
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
    pipe?: string | TypeOf<PipeTransform>;
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
    resolver?: TypeOf<ResolveInterceptorLike<TransportParameter>>[];
}



/**
 * get transport argument resolve handler token.
 * @param type 
 * @returns 
 */
export function getResolveHandlerToken(type: TypeOf<any>, propertyKey?: string): Token<ResolveHandler> {
    return getTokenOf(type, 'RESOLVE_HANDLER', propertyKey);
}


export const typeResolveInterceptor: ResolveInterceptorFn = (input, next, context) => {
    const payload = context.getPayload();
    if (payload) {
        const payloadType = getType(payload);
        if(!input.multi && (input.provider === payloadType || (!input.provider && input.type === payloadType))) {
            return payload;
        }
        const token = getResolveHandlerToken(payloadType);
        const hanlder = context.getInjector().get(token, null);
        if (hanlder) {
            return hanlder.handle(input, context, (res) => {
                if (isResolved(res)) return res;

                return next(input, context)
            })
        }


    }
    return next(input, context);
}