export declare abstract class UuidGenerator {
    /**
     * generate uuid.
     *
     * @returns {string} uuid string.
     */
    abstract generate(type?: 'uuid1' | 'uuid4' | 'uuid5'): string;
}
/**
 * default random uuid resolver.
 */
export declare class RandomUuidGenerator implements UuidGenerator {
    constructor();
    /**
     * generate uuid.
     *
     * @returns {string}
     * @memberof RandomUUID
     */
    generate(): string;
    protected randomS4(): string;
}
