import { Injectable, Type } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { HybirdTransport, Transport } from '../protocols';




export class Mappings {
    private maps: Map<Type | string, Handler[]>;
    constructor() {
        this.maps = new Map();
    }

    hasHanlder(type: Type | string): boolean {
        const handlers = this.maps.get(type);
        return !!handlers && handlers.length > 0;
    }

    getHanlder(type: Type | string): Handler[] | null {
        return this.maps.get(type) ?? null;
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

    removeHandler(event: Type | string, handler: Handler): this {
        const handlers = this.maps.get(event);
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
export class CodingMappings {

    maps: Map<string, Mappings>;
    constructor() {
        this.maps = new Map();
    }

    getEncodings(options?: CodingsOpts): Mappings {
        return this.get('encodings', options)
    }

    getDecodings(options?: CodingsOpts): Mappings {
        return this.get('decodings', options)
    }

    private get(subfix: string, options?: CodingsOpts): Mappings {
        const key = this.getKey(subfix, options);
        let mappings = this.maps.get(key);
        if (!mappings) {
            mappings = new Mappings();
            this.maps.set(key, mappings);
        }
        return mappings
    }

    private getKey(subfix: string, options?: CodingsOpts) {
        if (!options) return subfix;
        return `${options.microservice ? 'micro_' : ''}${(options.transport ?? '')}${(options.client ? '_client_' : '')}${subfix}`;
    }

}

export interface CodingsOpts {
    transport?: Transport | HybirdTransport;
    microservice?: boolean;
    client?: boolean;
}