import { Metadate } from './Metadate';

export interface ExecutionParam {
    files: string | string [];
}

/**
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata extends Metadate {
    providers: ExecutionParam[];
    propertyKey?: string | symbol;
    descriptor?: TypedPropertyDescriptor<any>
}
