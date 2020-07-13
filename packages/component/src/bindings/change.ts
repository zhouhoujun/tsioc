
export class WrappedValue {

    protected wrapped: any;

    constructor(value: any) { this.wrapped = value; }

    /** Creates a wrapped value. */
    static wrap(value: any): WrappedValue { return new WrappedValue(value); }

    /**
     * Returns the underlying value of a wrapped value.
     * Returns the given `value` when it is not wrapped.
     **/
    static unwrap(value: any): any { return WrappedValue.isWrapped(value) ? value.wrapped : value; }

    /** Returns true if `value` is a wrapped value. */
    static isWrapped(value: any): value is WrappedValue { return value instanceof WrappedValue; }
}
