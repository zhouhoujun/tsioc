
/**
 * the action execute data.
 *
 * @export
 * @interface ActionData
 * @template T
 */
export interface ActionData<T> {
    designMetadata: any;
    metadata: T;
    instance?: any;
}

