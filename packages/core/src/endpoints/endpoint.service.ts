import { Abstract, Type } from '@tsdi/ioc';
import { ConfigableHandlerOptions, HandlerService } from '../handlers/configable';




/**
 * endpoint options.
 * 
 * 终结点配置
 */
export interface EndpointOptions<T = any, TArg = any> extends ConfigableHandlerOptions<T, TArg> {
    /**
     * the endpoint run times limit. 
     */
    limit?: number;
    /**
     * auto bootstrap endpoint attached. default true.
     */
    bootstrap?: boolean;
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
export interface ConfigableEndpointOptions<T = any, TArg = any> extends EndpointOptions<T, TArg> { }


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
