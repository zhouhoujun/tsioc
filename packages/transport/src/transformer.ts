
import { Abstract } from '@tsdi/ioc';

/**
 * encoder
 */
@Abstract()
export abstract class Encoder<T> {
    /**
     * encode input source.
     * @param input 
     */
    abstract encode(input: T): T;
}

/**
 * decoder
 */
@Abstract()
export abstract class Decoder<T> {
    /**
     * decode input source.
     * @param input 
     */
    abstract decode(input: T): T;
}
