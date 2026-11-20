import { Observable, Subject } from 'rxjs';
import { Route, Routes } from './route';

export type RouteTableChangeType = 'register' | 'replace' | 'remove' | 'reset';

/** A committed route-table change. */
export interface RouteTableChange {
    readonly type: RouteTableChangeType;
    readonly revision: number;
    readonly source?: string;
    readonly routes: readonly Route[];
}

/** Immutable view of the current route set. */
export interface RouteTableSnapshot {
    readonly revision: number;
    readonly routes: readonly Route[];
}

export interface RouteSourceSnapshot {
    readonly source: string;
    readonly routes: readonly Route[];
}

/**
 * Tracks dynamic route sources and table revisions.
 *
 * The registry is deliberately separate from the matcher: it owns source
 * bookkeeping, revision numbers and change notification; `OptimizedRouter`
 * applies the actual route inserts/removals.
 */
export class RouteRegistry {
    private readonly sources = new Map<string, Route[]>();
    private readonly changeSubject = new Subject<RouteTableChange>();
    private _revision = 0;

    get revision(): number {
        return this._revision;
    }

    get size(): number {
        return this.sources.size;
    }

    get changes(): Observable<RouteTableChange> {
        return this.changeSubject.asObservable();
    }

    listSources(): RouteSourceSnapshot[] {
        return Array.from(this.sources.keys()).map(source => ({
            source,
            routes: this.sources.get(source)!.slice()
        }));
    }

    getSource(source: string): readonly Route[] | undefined {
        return this.sources.get(source)?.slice();
    }

    setSource(source: string, routes: Routes): readonly Route[] | undefined {
        const previous = this.sources.get(source);
        this.sources.set(source, routes.slice());
        return previous?.slice();
    }

    deleteSource(source: string): readonly Route[] | undefined {
        const previous = this.sources.get(source);
        this.sources.delete(source);
        return previous?.slice();
    }

    clearSources(): void {
        this.sources.clear();
    }

    /** Advance the revision without emitting a change (used by manual use/unuse). */
    bump(): number {
        return ++this._revision;
    }

    touch(type: RouteTableChangeType, source: string | undefined, routes: readonly Route[]): RouteTableChange {
        const change: RouteTableChange = {
            type,
            revision: ++this._revision,
            source,
            routes: routes.slice()
        };
        this.changeSubject.next(change);
        return change;
    }

    snapshot(routes: Routes): RouteTableSnapshot {
        return {
            revision: this._revision,
            routes: routes.slice()
        };
    }

    destroy(): void {
        this.sources.clear();
        this.changeSubject.complete();
    }
}
