
export abstract class Message<T> {
    /**
     * packet id
     */
    id?: string | number;

    /**
     * payload
     */
    abstract get payload(): T | null;
}
