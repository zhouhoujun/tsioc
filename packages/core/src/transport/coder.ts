import { Abstract } from '@tsdi/ioc';
import { Packet } from './packet';

/**
 * Decoder
 */
@Abstract()
export abstract class Decoder<T = any> {
    /**
     * decode buffer to Packet.
     * @param buffer 
     */
    abstract decode(buffer: T, encoding?: any): Packet;
}

/**
 * Encoder
 */
@Abstract()
export abstract class Encoder<T = any> {
    /**
     * encode data to buffer.
     * @param data 
     */
    abstract encode(data: any): T;
}
