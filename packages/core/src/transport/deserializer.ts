import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class Deserializer {
    /**
     * deserialize input.
     * @param input 
     */
    abstract deserialize<T>(input: string | Uint8Array): T;
}
