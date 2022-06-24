import { Abstract } from '@tsdi/ioc';

/**
 * Serializer
 */
@Abstract()
export abstract class Serializer {
    /**
     * serialize input.
     * @param input 
     */
    abstract serialize<T>(input: T): string | Uint8Array;
}

