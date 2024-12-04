
export abstract class Deserializer {
    abstract deserialize<T>(input: string | Buffer): T;
}