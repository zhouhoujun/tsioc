
export abstract class Message<T = any> {
    /**
     * packet id
     */
    id?: string | number;

    /**
     * payload
     */
    abstract get payload(): T | null;
}
