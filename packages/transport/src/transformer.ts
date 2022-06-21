
import { Abstract } from '@tsdi/ioc';

/**
 * request endo
 */
@Abstract()
export abstract class Encoder<T> {
    abstract encode(input: T): T;
}

@Abstract()
export abstract class Decoder<T> {
    abstract decode(input: T): T;
}
