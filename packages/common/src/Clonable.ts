
/**
 * clonable.
 */
export interface Clonable<T> {
    clone(update?: any): T;
}
