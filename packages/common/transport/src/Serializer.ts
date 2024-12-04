

export abstract class Serializer {
    abstract serialize<T>(input: T): string | Buffer;
}