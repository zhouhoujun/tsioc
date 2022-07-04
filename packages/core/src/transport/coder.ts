import { Abstract } from '@tsdi/ioc';

/**
 * Decoder
 */
@Abstract()
export abstract class Decoder {
    /**
     * decode to object T.
     * @param str 
     */
    abstract decode<T>(str: string | Uint8Array): T;
}

/**
 * Encoder
 */
@Abstract()
export abstract class Encoder {
    /**
     * encode object.
     * @param obj 
     */
    abstract encode<T>(obj: T): string;
}