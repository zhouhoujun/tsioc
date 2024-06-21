import { Injectable, Type, getClass } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { CodingsContext } from './context';
import { Observable, map, mergeMap, of, throwError } from 'rxjs';
import { CodingsNotHandleExecption } from './execptions';
import { CodingsOptions } from './options';



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

/**
 * Coding Mappings
 */
@Injectable({
    static: true,
    providedIn: 'root'
})
export class CodingMappings {

    private maps: Map<string, Mappings>;

    private _enSubfix = 'encodings';
    private _deSubFix = 'decodings';
    constructor() {
        this.maps = new Map();
    }

    encode<T>(data: T, context: CodingsContext): Observable<any> {
        return this.encodeType(getClass(data), data, context);
    }

    encodeType<T>(type: Type<T> | string, data: T, context: CodingsContext): Observable<any> {
        const handlers = this.getEncodeHanlders(type, context.getDefault(type), context.options);

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
            return throwError(() => new CodingsNotHandleExecption(data, type, 'encodings', context, `${context.options.group} ${context.options.name ?? ''}`))
        }
    }

    decode<T>(data: T, context: CodingsContext): Observable<any> {
        return this.decodeType(getClass(data), data, context);
    }

    decodeType<T>(type: Type<T> | string, data: T, context: CodingsContext): Observable<any> {
        const handlers = this.getDecodeHanlders(type, context.getDefault(type), context.options);

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
            return throwError(() => new CodingsNotHandleExecption(data, type, 'decodings', context, `${context.options.group} ${context.options.name ?? ''}`))
        }
    }


    getEncodeHanlders(type: Type | string, defaultType?: Type | string, options?: CodingsOptions): Handler[] | null {
        const handlers = this.maps.get(this.getKey(this._enSubfix, options))?.getHanlder(type, defaultType)
            ?? this.maps.get(this.getKey(this._enSubfix))?.getHanlder(type, defaultType);
        return handlers ?? null;
    }

    getEncodings(options?: CodingsOptions): Mappings {
        return this.get(this._enSubfix, options)
    }

    getDecodeHanlders(type: Type | string, defaultType?: Type | string, options?: CodingsOptions): Handler[] | null {
        const handlers = this.maps.get(this.getKey(this._deSubFix, options))?.getHanlder(type, defaultType)
            ?? this.maps.get(this.getKey(this._deSubFix))?.getHanlder(type, defaultType);
        return handlers ?? null;
    }

    getDecodings(options?: CodingsOptions): Mappings {
        return this.get(this._deSubFix, options)
    }

    private get(subfix: string, options?: CodingsOptions): Mappings {
        const key = this.getKey(subfix, options);
        let mappings = this.maps.get(key);
        if (!mappings) {
            mappings = new Mappings();
            this.maps.set(key, mappings);
        }
        return mappings
    }

    private getKey(subfix: string, options?: CodingsOptions) {
        if (!options) return subfix;

        return `${options.group ?? ''}${options.subfix ?? ''}${subfix}`;
    }

}
