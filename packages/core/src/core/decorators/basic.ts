/**
 * define the property enumerable of not.
 *
 * @export
 * @param {boolean} value
 * @returns
 */
export function enumerable(value: boolean) {
    return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
        if (descriptor) {
            descriptor.enumerable = value;
        } else {
            descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {writable: true};
            descriptor.enumerable = value;
            Object.defineProperty(target, propertyKey, descriptor);
        }
    };
}

export function configurable(value: boolean) {
    return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
        if (descriptor) {
            descriptor.configurable = value;
        } else {
            descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {writable: true};
            descriptor.configurable = value;
            Object.defineProperty(target, propertyKey, descriptor);
        }
    };
}

/**
 * define class is sealed.
 *
 * @param {Function} constructor
 */
export function sealed(constructor: Function) {
    Object.seal(constructor);
    Object.seal(constructor.prototype);
}