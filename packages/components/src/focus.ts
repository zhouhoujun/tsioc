export type FocusRegionId = string;

export interface FocusRegion {
    readonly id: FocusRegionId;
    readonly priority?: number;
    contains?(target: unknown): boolean;
    focus?(): void;
    blur?(): void;
    handleKey?(event: unknown): boolean | Promise<boolean>;
    handleMouse?(event: unknown): boolean | Promise<boolean>;
}

/** Renderer-neutral focus ownership and event routing primitive. */
export class FocusRegionManager {
    private readonly regions = new Map<FocusRegionId, FocusRegion>();
    private active?: FocusRegionId;

    get activeRegion(): FocusRegionId | undefined { return this.active; }

    register(region: FocusRegion): () => void {
        this.regions.set(region.id, region);
        return () => {
            if (this.active === region.id) this.blur(region.id);
            this.regions.delete(region.id);
        };
    }

    focus(id: FocusRegionId): boolean {
        const next = this.regions.get(id);
        if (!next) return false;
        if (this.active === id) return true;
        this.regions.get(this.active || '')?.blur?.();
        this.active = id;
        next.focus?.();
        return true;
    }

    blur(id?: FocusRegionId): boolean {
        if (!this.active || (id && id !== this.active)) return false;
        this.regions.get(this.active)?.blur?.();
        this.active = undefined;
        return true;
    }

    async routeKey(event: unknown): Promise<boolean> {
        const region = this.regions.get(this.active || '');
        return region?.handleKey ? !!(await region.handleKey(event)) : false;
    }

    async routeMouse(event: unknown, target?: unknown): Promise<boolean> {
        const candidates = [...this.regions.values()]
            .filter(region => region.contains?.(target) === true)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const region = candidates[0];
        if (!region) return false;
        this.focus(region.id);
        return region.handleMouse ? !!(await region.handleMouse(event)) : true;
    }
}
