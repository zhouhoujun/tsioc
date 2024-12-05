import { Injectable, Type, getClass } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { Observable, map, mergeMap, of, throwError } from 'rxjs';
import { DeserializeNotHandleExecption, SerializeNotHandleExecption } from './execptions';
import { SerializeContext } from './Serializer';
import { DeserializeContext } from './Deserializer';




/**
 * Mappings.
 */
export class Mappings {
    private maps: Map<Type | string, Handler[]>;
    constructor() {
        this.maps = new Map();
    }

    hasHanlder(type: Type | string): boolean {
        const handlers = this.maps.get(type);
        return !!handlers && handlers.length > 0;
    }

    getHanlder(type: Type | string, defaultType?: Type | string): Handler[] | null {
        return this.maps.get(type) ?? (defaultType ? this.maps.get(defaultType) ?? null : null);
    }

    addHandler(type: Type | string, handler: Handler, order = -1) {
        const handlers = this.maps.get(type);
        if (handlers) {
            if (handlers.some(i => i.equals ? i.equals(handler) : i === handler)) return this;
            order >= 0 ? handlers.splice(order, 0, handler) : handlers.push(handler);
        } else {
            this.maps.set(type, [handler]);
        }
        return this;

    }

    removeHandler(type: Type | string, handler: Handler): this {
        const handlers = this.maps.get(type);
        if (handlers) {
            const idx = handlers.findIndex(i => i.equals ? i.equals(handler) : i === handler);
            if (idx >= 0) {
                handlers.splice(idx, 1);
            }
        }
        return this;
    }
}


@Injectable({
    static: true,
    providedIn: 'root'
})
export class SerializeMappings {

    private maps: Map<string, Mappings>;

    constructor() {
        this.maps = new Map();
    }

    serialize<T>(data: T, context: SerializeContext): Observable<any> {
        return this.serializeType(getClass(data), data, context);
    }

    serializeType<T>(type: Type<T> | string, data: T, context: SerializeContext): Observable<any> {
        const handlers = this.getHanlders(context.transport.protocol, type, context.getDefault(type));

        if (handlers && handlers.length) {
            return handlers.reduce((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(i => {
                        if (context.isCompleted(i)) return of(i);
                        return curr.handle(i, context).pipe(
                            map(n => {
                                context.next(n);
                                return n;
                            })
                        )
                    })
                );
            }, of(data))
        } else {
            return throwError(() => new SerializeNotHandleExecption(data, type, context))
        }
    }

    getHanlders(protocol: string, type: Type | string, defaultType?: Type | string) {
        return this.maps.get(protocol)?.getHanlder(type, defaultType) ?? this.maps.get('_')?.getHanlder(type, defaultType);
    }
}



@Injectable({
    static: true,
    providedIn: 'root'
})
export class DeserializeMappings {

    private maps: Map<string, Mappings>;

    constructor() {
        this.maps = new Map();
    }

    deserialize<T>(data: any, context: DeserializeContext, defaultHandle?: (data:T)=> Observable<T>): Observable<T> {
        return this.deserializeType(getClass(data), data, context);
    }

    deserializeType<T>(type: Type<T> | string, data: any, context: DeserializeContext, defaultHandle?: (data:T)=> Observable<T>): Observable<T> {
        const handlers = this.getHanlders(context.transport.protocol, type, context.getDefault(type));

        if (handlers && handlers.length) {
            return handlers.reduce((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(i => {
                        if (context.isCompleted(i)) return of(i);
                        return curr.handle(i, context).pipe(
                            map(n => {
                                context.next(n);
                                return n;
                            })
                        )
                    })
                );
            }, of(data))
        } else {
            if(defaultHandle) return defaultHandle(data)
            return throwError(() => new DeserializeNotHandleExecption(data, type, context))
        }
    }

    getHanlders(protocol: string, type: Type | string, defaultType?: Type | string) {
        return this.maps.get(protocol)?.getHanlder(type, defaultType) ?? this.maps.get('_')?.getHanlder(type, defaultType);
    }
}

