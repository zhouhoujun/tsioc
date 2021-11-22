/**
 * serializer.
 */
export interface Serializer<TInput = any, TOutput = any> {
    /**
     * serialize value
     * @param value 
     */
    serialize(value: TInput): TOutput;
}
