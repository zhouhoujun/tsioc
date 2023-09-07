import { Abstract, EMPTY, Execption, Injector, OperationArgumentResolver, isDefined } from '@tsdi/ioc';
import { EndpointContext, EndpointInvokeOpts, MODEL_RESOLVERS, createPayloadResolver } from '@tsdi/core';

/**
 * abstract transport context.
 * 
 * 传输节点上下文
 */
@Abstract()
export abstract class TransportContext<TInput = any, TSocket = any> extends EndpointContext<TInput> {

    protected override playloadDefaultResolvers(): OperationArgumentResolver[] {
        return [...primitiveResolvers, ...this.injector.get(MODEL_RESOLVERS, EMPTY)];
    }

    /**
     * Get request rul
     */
    abstract get url(): string;
    /**
     * Set request url
     */
    abstract set url(value: string);

    /**
     * The request method.
     */
    abstract get method(): string;

    /**
     * socket.
     */
    abstract get socket(): TSocket;

}

/**
 * Transport context options.
 */
export interface TransportContextOpts<T = any, TSocket = any> extends EndpointInvokeOpts<T> {
    url?: string;
    method?: string;
    socket?: TSocket;
}

export const TRANSPORT_CONTEXT_IMPL = {
    create<T>(injector: Injector, options?: TransportContextOpts<T>): TransportContext<T> {
        throw new Execption('not implemented.')
    }
}

/**
 * create transport context
 * @param injector 
 * @param options 
 * @returns 
 */
export function createTransportContext<TInput, TSocket>(injector: Injector, options?: TransportContextOpts<TInput, TSocket>): TransportContext<TInput, TSocket> {
    return TRANSPORT_CONTEXT_IMPL.create(injector, options)
}


const primitiveResolvers = createPayloadResolver(
    (ctx, scope, field) => {
        let data = ctx.arguments;

        if (field && !scope) {
            scope = 'query'
        }
        if (scope) {
            data = data[scope];
            if (field) {
                data = isDefined(data) ? data[field] : null;
            }
        }
        return data;
    },
    (param, payload) => payload && isDefined(payload[param.scope ?? 'query']));


/**
 * throw able.
 */
export interface Throwable {
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    throwError(status: number, message?: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    throwError(message: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param error error 
     * @returns instance of {@link TransportError}
     */
    throwError(error: Error): Error;
}
