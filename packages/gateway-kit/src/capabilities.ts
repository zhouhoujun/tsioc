/** Shared capability descriptors for gateway clients (`app.capabilities` etc.). */

export type GatewayCapabilityKind = 'rpc' | 'route';

export interface GatewayCapabilityDescriptor {
    /** Stable method or route id (`app.ping`, `session.list`, ...). */
    id: string;
    kind?: GatewayCapabilityKind;
    /** Human-readable summary (docs/OpenAPI/capability listings). */
    summary?: string;
    /** `false` marks the method public. */
    auth?: boolean | string;
}

/**
 * Ordered registry of what a gateway exposes. Both gateways can publish the
 * same shape so clients discover capabilities without hard-coded lists.
 */
export class GatewayCapabilityRegistry {
    private readonly entries = new Map<string, GatewayCapabilityDescriptor>();

    constructor(items: Array<string | GatewayCapabilityDescriptor> = []) {
        this.registerMany(items);
    }

    register(item: string | GatewayCapabilityDescriptor): this {
        const descriptor: GatewayCapabilityDescriptor = typeof item === 'string' ? { id: item } : { ...item };
        const id = String(descriptor.id || '').trim();
        if (!id) {
            return this;
        }
        // Re-registering updates metadata but keeps the original position.
        this.entries.set(id, { ...descriptor, id });
        return this;
    }

    registerMany(items: Array<string | GatewayCapabilityDescriptor>): this {
        for (const item of items || []) {
            this.register(item);
        }
        return this;
    }

    has(id: string): boolean {
        return this.entries.has(String(id || ''));
    }

    get(id: string): GatewayCapabilityDescriptor | undefined {
        return this.entries.get(String(id || ''));
    }

    /** Ordered descriptors (registration order). */
    list(): GatewayCapabilityDescriptor[] {
        return Array.from(this.entries.values());
    }

    /** Ordered method/route ids for `app.capabilities`. */
    methods(): string[] {
        return Array.from(this.entries.keys());
    }

    get size(): number {
        return this.entries.size;
    }
}
