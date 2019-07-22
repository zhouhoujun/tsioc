import { isSymbol } from '@tsdi/ioc';

export namespace observe {
    const isPrimitive = value => value === null || (typeof value !== 'object' && typeof value !== 'function');

    const proxyCache = new WeakMap();

    export function getProxy(target) {
        return proxyCache.has(target) ? proxyCache.get(target) : target;
    }

    export function onPropertyChange(target: any, property: string, handleChange: (target: any, prop: string, vaule?: any, old?: any) => void) {
        const handler = {
            get(target, prop, receiver) {
                try {
                    return new Proxy(target[prop], handler);
                } catch (err) {
                    return Reflect.get(target, prop, receiver)
                }
            },
            defineProperty(target, property, descriptor) {
                const result = Reflect.defineProperty(target, property, descriptor);
                if (!isSymbol(property)) {
                    handleChange(target, property, descriptor.value, undefined);
                }
                return result;
            },

            deleteProperty(target, property) {
                if (!Reflect.has(target, property)) {
                    return true;
                }

                const ignore = isSymbol(property);
                const previous = ignore ? null : Reflect.get(target, property);
                const result = Reflect.deleteProperty(target, property);

                if (!ignore) {
                    handleChange(target, property, undefined, previous);
                }

                return result;
            }
        };
        return new Proxy(target, handler);
    }

    export function onChange(object: any, handleChange: (target: any, prop: string, vaule?: any, old?: any) => void) {

        const equals = (a, b) => a === b;

        const buildProxy = (value) => {

            let proxy = proxyCache.get(value);

            if (proxy === undefined) {
                proxy = new Proxy(value, handler);
                proxyCache.set(value, proxy);
            }

            return proxy;
        };

        const handler = {
            get(target, property, receiver) {
                let value = Reflect.get(target, property, receiver);
                if (
                    isPrimitive(value) ||
                    property === 'constructor'
                ) {
                    return value;
                }

                const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
                if (descriptor && !descriptor.configurable) {
                    if (descriptor.set && !descriptor.get) {
                        return undefined;
                    }

                    if (descriptor.writable === false) {
                        return value;
                    }
                }
                return buildProxy(value);
            },

            set(target, property, value, receiver) {
                // if (value && proxyCache.has(value)) {
                //     value = proxyCache.get(value);
                // }
                const ignore = isSymbol(property);
                const previous = ignore ? null : Reflect.get(target, property, receiver);
                const result = Reflect.set(proxyCache.get(target) || target, property, value);

                if (!ignore && !equals(previous, value)) {
                    handleChange(target, property, value, previous);
                }

                return result;
            },

            defineProperty(target, property, descriptor) {
                const result = Reflect.defineProperty(target, property, descriptor);
                if (!isSymbol(property)) {
                    handleChange(target, property, descriptor.value, undefined);
                }
                return result;
            },

            deleteProperty(target, property) {
                if (!Reflect.has(target, property)) {
                    return true;
                }

                const ignore = isSymbol(property);
                const previous = ignore ? null : Reflect.get(target, property);
                const result = Reflect.deleteProperty(target, property);

                if (!ignore) {
                    handleChange(target, property, undefined, previous);
                }

                return result;
            }
        }

        const proxy = buildProxy(object);
        // handleChange = handleChange.bind(proxy);
        return proxy;
    }

}
