import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class Encoder {
    abstract encode<T>(input: any): T;
}

@Abstract()
export abstract class Decoder {
    abstract decode<T>(input: any): T;
}
