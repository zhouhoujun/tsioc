import { Abstract } from '@tsdi/ioc';
import { Packet } from './packet';

/**
 * Decoder
 */
@Abstract()
export abstract class Decoder<T = string | Uint8Array> {
    /**
     * decode buffer to Packet.
     * @param buffer 
     */
    abstract decode(buffer: T): Packet;
}

/**
 * Encoder
 */
@Abstract()
export abstract class Encoder<T = string | Uint8Array> {
    /**
     * encode Packet to buffer.
     * @param pkt 
     */
    abstract encode(pkt: Packet): T;
}