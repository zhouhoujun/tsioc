/**
 * Marks a method that does not need a reactive proxy. Unmarked methods keep
 * the normal proxy behavior, including a proxied `this` when invoked through
 * a reactive state object.
 */
export const NO_REACTIVE = Symbol('__NO_REACTIVE');
const noReactiveProperties = new WeakMap<object, Set<string | symbol>>();

export function NoReactive(
    target: object,
    _propertyKey: string | symbol,
    descriptor?: PropertyDescriptor
): void {
    const operation = descriptor?.value;
    if (operation) {
        Object.defineProperty(operation, NO_REACTIVE, {
            value: true,
            configurable: false,
            enumerable: false
        });
        return;
    }
    let properties = noReactiveProperties.get(target);
    if (!properties) {
        properties = new Set();
        noReactiveProperties.set(target, properties);
    }
    properties.add(_propertyKey);
}

export function isNoReactiveProperty(target: object, key: string | symbol, value: any): boolean {
    if (value?.[NO_REACTIVE]) {
        return true;
    }
    let owner = target;
    while (owner) {
        if (noReactiveProperties.get(owner)?.has(key)) {
            return true;
        }
        owner = Object.getPrototypeOf(owner);
    }
    return false;
}
