import { Abstract } from '@tsdi/ioc';

/**
 * Decoder
 */
@Abstract()
export abstract class Decoder<T> {
    /**
     * decode to object T.
     * @param str 
     */
    abstract decode(str: string): T;
}

/**
 * Encoder
 */
@Abstract()
export abstract class Encoder<T> {
    /**
     * encode object.
     * @param obj 
     */
    abstract encode(obj: T): string;
}