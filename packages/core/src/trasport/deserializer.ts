/**
 * descrializer.
 */
export interface Deserializer<TInput = any, TOutput = any> {
    /**
     * deserialize value.
     * @param value 
     */
    deserialize(value: TInput): TOutput | Promise<TOutput>;
}
