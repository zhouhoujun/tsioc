import { ArgumentException, AbstractType, Parameter, RuntimeHandler, Runtime, ResolveInterceptorFn } from '@tsdi/ioc';
import { ParameterScope, TransportParameter } from './resolver';
import { PipeTransform } from '../pipes/pipe';
export declare function missingPipeException<T>(parameter: Parameter<T>, type?: AbstractType, method?: string | symbol): ArgumentException;
export declare function getMutilResolveHanlder(runtime: Runtime): RuntimeHandler<[any, PipeTransform, TransportParameter]>;
export declare function createPayloadResolveInterceptors(getPayload: (input: any, scope?: ParameterScope, filed?: string) => any): ResolveInterceptorFn<TransportParameter>[];
/**
 * is list or not.
 * @param target
 * @returns
 */
export declare function isList(target: any): target is string | any[];
