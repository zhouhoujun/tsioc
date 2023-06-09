import { Abstract, Type, Token } from '@tsdi/ioc';
import { HandlerOptions, HandlerService } from '../handlers/handler.service';
import { Interceptor } from '../Interceptor';
import { CanActivate } from '../guard';
import { Filter } from '../filters/filter';
import { Backend } from '../Handler';


/**
 * endpoint options.
 * 
 * 终结点配置
 */
export interface EndpointOptions<T = any, TArg = any> extends HandlerOptions<T, TArg> {
    /**
     * interceptors token.
     */
    interceptorsToken?: Token<Interceptor<T>[]>;
    /**
     * guards tokens.
     */
    guardsToken?: Token<CanActivate<T>[]>;
    /**
     * filter tokens.
     */
    filtersToken?: Token<Filter<T>[]>;
    /**
     * endpoint order
     */
    order?: number;
    /**
     * endpoint handler response as.
     */
    response?: 'body' | 'header' | 'response' | Type<Respond<T>> | ((input: T, returnning: any) => void)
}

/**
 * configable endpoint options.
 * 
 * 可配置结点配置
 */
export interface ConfigableEndpointOptions<T = any, TArg = any> extends EndpointOptions<T, TArg> {
    backend?: Token<Backend> | Backend;
}


/**
 * endpoint service.
 * 
 * 终端传输节点服务
 */
export interface EndpointService extends HandlerService {

}

/**
 * Respond 
 */
@Abstract()
export abstract class Respond<TInput = any> {
    /**
     * respond with handled data.
     * @param input endpoint input data.
     * @param value handled returnning value
     */
    abstract respond<T>(input: TInput, value: T): void;
}

/**
 * Respond adapter with response type.
 */
@Abstract()
export abstract class TypedRespond<TInput = any>  {
    /**
     * respond with handled data.
     * @param input input data.
     * @param value handled returnning value
     * @param responseType response type
     */
    abstract respond<T>(input: TInput, value: T, responseType: 'body' | 'header' | 'response'): void;
}
