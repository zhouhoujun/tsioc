import { Type } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';


export class Mappings {
    private maps: Map<Type, Handler[]>;
    constructor() {
        this.maps = new Map();
    }

    hasHanlder(type: Type): boolean {
        const handlers = this.maps.get(type);
        return !!handlers && handlers.length > 0;
    }

    getHanlder(type: Type): Handler[] | null {
        return this.maps.get(type) ?? [];
    }

    addHandler(type: Type, handler: Handler, order = -1) {
        const handlers = this.maps.get(type);
        if (handlers) {
            if (handlers.some(i => i.equals ? i.equals(handler) : i === handler)) return this;
            order >= 0 ? handlers.splice(order, 0, handler) : handlers.push(handler);
        } else {
            this.maps.set(type, [handler]);
        }
        return this;

    }

    removeHandler(event: Type, handler: Handler): this {
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
