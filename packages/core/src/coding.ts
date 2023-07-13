import { Abstract } from '@tsdi/ioc';
import { ITransformStream } from './transport/stream';


@Abstract()
export abstract class Encoder {
    abstract encode<T>(input: any): T;
    abstract endcodeTransform(options?: any): ITransformStream;
}

@Abstract()
export abstract class Decoder {
    abstract decode<T>(input: any): T;
    abstract decodeTransform(options?: any): ITransformStream;
}
