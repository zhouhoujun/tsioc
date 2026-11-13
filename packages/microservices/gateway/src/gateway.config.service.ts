import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import {
    GATEWAY_OPTIONS,
    GatewayOptions,
    GatewayRouteOptions,
    GatewayRuleOptions
} from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';

export interface GatewayConfigDiff {
    routes: {
        added: string[];
        removed: string[];
        changed: string[];
    };
    rules: {
        added: string[];
        removed: string[];
        changed: string[];
    };
    options: string[];
}

export interface GatewayConfigApplyOptions {
    /**
     * optimistic concurrency guard. When provided it must match the current
     * version, otherwise a 409 is raised.
     */
    expectedVersion?: number;
    /**
     * compute and return the diff without applying it.
     */
    dryRun?: boolean;
    /**
     * merge routes by `path:service` instead of replacing the whole table.
     */
    mergeRoutes?: boolean;
    source?: string;
    actor?: string;
}

export interface GatewayConfigApplyResult {
    version: number;
    applied: boolean;
    dryRun: boolean;
    diff: GatewayConfigDiff;
    warnings: string[];
}

export interface GatewayConfigHistoryEntry {
    version: number;
    timestamp: string;
    source?: string;
    actor?: string;
    diff: GatewayConfigDiff;
    options: Partial<GatewayOptions>;
}

export class GatewayConfigValidationError extends Error {
    readonly statusCode = 400;
    readonly statusMessage = 'Bad Request';
    readonly expose = true;

    constructor(readonly errors: string[]) {
        super(errors.length === 1 ? errors[0] : `Invalid gateway config: ${errors.join('; ')}`);
        this.name = 'GatewayConfigValidationError';
    }
}

export class GatewayConfigVersionError extends Error {
    readonly statusCode = 409;
    readonly statusMessage = 'Conflict';
    readonly expose = true;

    constructor(readonly expected: number, readonly actual: number) {
        super(`Gateway config version conflict: expected ${expected}, actual ${actual}`);
        this.name = 'GatewayConfigVersionError';
    }
}

export class GatewayConfigNotFoundError extends Error {
    readonly statusCode = 404;
    readonly statusMessage = 'Not Found';
    readonly expose = true;

    constructor(readonly version: number) {
        super(`Gateway config version ${version} is not in history`);
        this.name = 'GatewayConfigNotFoundError';
    }
}

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'ANY'];

/**
 * Transactional gateway configuration.
 *
 * All dynamic route/rule/option writes should go through this service:
 * validation → diff → atomic swap → version bump → audit/history.
 */
@Injectable()
export class GatewayConfigService {
    private version = 0;
    private current: Partial<GatewayOptions> = {};
    private readonly history: GatewayConfigHistoryEntry[] = [];
    private readonly maxHistory: number;

    constructor(
        @Inject(GatewayRuntime) private readonly runtime: GatewayRuntime,
        @Inject(GATEWAY_OPTIONS, { nullable: true }) private readonly options?: GatewayOptions,
        @Optional() @Inject(Logger) private readonly logger?: Logger
    ) {
        this.maxHistory = 20;
    }

    getVersion(): number {
        return this.version;
    }

    getCurrent(): Partial<GatewayOptions> {
        return this.current;
    }

    getHistory(): GatewayConfigHistoryEntry[] {
        return this.history.slice().reverse();
    }

    /**
     * Validate a dynamic config patch without applying it.
     */
    validate(patch: Partial<GatewayOptions>): string[] {
        const errors: string[] = [];
        if (patch.routes !== undefined && patch.routes !== null && !Array.isArray(patch.routes)) {
            errors.push('routes must be an array');
        }
        if (Array.isArray(patch.routes)) {
            errors.push(...this.validateRoutes(patch.routes));
        }
        if (patch.rules !== undefined && patch.rules !== null && !Array.isArray(patch.rules)) {
            errors.push('rules must be an array');
        }
        if (Array.isArray(patch.rules)) {
            errors.push(...this.validateRules(patch.rules));
        }
        if (patch.routeMatching !== undefined && patch.routeMatching !== 'segment' && patch.routeMatching !== 'legacy') {
            errors.push("routeMatching must be 'segment' or 'legacy'");
        }
        return errors;
    }

    /**
     * Apply a validated patch atomically. Throws validation/version errors
     * without changing the live runtime.
     */
    apply(patch: Partial<GatewayOptions>, options: GatewayConfigApplyOptions = {}): GatewayConfigApplyResult {
        if (options.expectedVersion != null && options.expectedVersion !== this.version) {
            throw new GatewayConfigVersionError(options.expectedVersion, this.version);
        }
        const errors = this.validate(patch);
        if (errors.length) {
            throw new GatewayConfigValidationError(errors);
        }

        const next = this.merge(this.current, patch, options.mergeRoutes === true);
        const diff = this.diff(this.current, next);
        const warnings = this.warnings(next);

        if (options.dryRun) {
            return { version: this.version, applied: false, dryRun: true, diff, warnings };
        }

        // Single atomic swap: readers either see the old or the new table.
        this.current = next;
        this.runtime.setDynamicOptions(next);
        this.version += 1;

        const entry: GatewayConfigHistoryEntry = {
            version: this.version,
            timestamp: new Date().toISOString(),
            source: options.source,
            actor: options.actor,
            diff,
            options: this.clone(next)
        };
        this.history.push(entry);
        while (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        const routesChanged = diff.routes.added.length + diff.routes.removed.length + diff.routes.changed.length > 0;
        if (routesChanged || diff.options.length) {
            this.runtime.invalidateConfigCaches?.();
        }

        this.logger?.info?.('gateway.config', {
            version: this.version,
            source: options.source,
            actor: options.actor,
            diff
        });

        return { version: this.version, applied: true, dryRun: false, diff, warnings };
    }

    /**
     * Roll back to a historical version. The rollback itself becomes a new
     * version so clients can still reason about monotonic versions.
     */
    rollback(version: number, options: GatewayConfigApplyOptions = {}): GatewayConfigApplyResult {
        const entry = this.history.find(item => item.version === version);
        if (!entry) {
            throw new GatewayConfigNotFoundError(version);
        }
        return this.apply(entry.options, {
            ...options,
            source: options.source ?? `rollback:${version}`
        });
    }

    private validateRoutes(routes: GatewayRouteOptions[]): string[] {
        const errors: string[] = [];
        const seen = new Set<string>();
        routes.forEach((route, index) => {
            const at = `routes[${index}]`;
            if (!route || typeof route !== 'object') {
                errors.push(`${at} must be an object`);
                return;
            }
            const path = String(route.path ?? '').trim();
            if (!path) {
                errors.push(`${at}.path is required`);
            } else if (!path.startsWith('/')) {
                errors.push(`${at}.path must start with /`);
            } else if (/\s/.test(path)) {
                errors.push(`${at}.path must not contain whitespace`);
            }
            if (!route.service && !route.targetUrl) {
                errors.push(`${at} requires service or targetUrl`);
            }
            if (route.targetUrl && !/^(https?:\/\/|\/)/i.test(String(route.targetUrl))) {
                errors.push(`${at}.targetUrl must be an http(s) URL or path`);
            }
            if (route.targetPath && !String(route.targetPath).startsWith('/')) {
                errors.push(`${at}.targetPath must start with /`);
            }
            if (route.timeout != null) {
                const timeout = Number(route.timeout);
                if (!Number.isFinite(timeout) || timeout < 0 || timeout > 600_000) {
                    errors.push(`${at}.timeout must be between 0 and 600000`);
                }
            }
            const methods = (route.methods ?? []).map(method => String(method).trim().toUpperCase()).filter(Boolean);
            if (methods.some(method => !ALLOWED_METHODS.includes(method))) {
                errors.push(`${at}.methods contains an unsupported method`);
            }
            if (path) {
                const key = `${path}|${methods.slice().sort().join(',') || 'ANY'}`;
                if (seen.has(key)) {
                    errors.push(`${at} duplicates route ${path} (${methods.join(',') || 'ANY'})`);
                }
                seen.add(key);
            }
        });
        return errors;
    }

    private validateRules(rules: GatewayRuleOptions[]): string[] {
        const errors: string[] = [];
        const seen = new Set<string>();
        rules.forEach((rule, index) => {
            const at = `rules[${index}]`;
            if (!rule || typeof rule !== 'object') {
                errors.push(`${at} must be an object`);
                return;
            }
            if (!rule.id) {
                errors.push(`${at}.id is required`);
            } else if (seen.has(rule.id)) {
                errors.push(`${at}.id duplicates '${rule.id}'`);
            } else {
                seen.add(rule.id);
            }
            if (!Array.isArray(rule.when) || !rule.when.length) {
                errors.push(`${at}.when must contain at least one condition`);
            }
            if (!rule.action || (rule.action.type !== 'route' && rule.action.type !== 'deny')) {
                errors.push(`${at}.action.type must be 'route' or 'deny'`);
            } else if (rule.action.type === 'route' && !rule.action.service && !rule.action.targetUrl) {
                errors.push(`${at}.action requires service or targetUrl`);
            }
            if (rule.priority != null && !Number.isFinite(Number(rule.priority))) {
                errors.push(`${at}.priority must be a number`);
            }
        });
        return errors;
    }

    private warnings(options: Partial<GatewayOptions>): string[] {
        const warnings: string[] = [];
        const routes = options.routes;
        if (routes?.some(route => route.targetUrl && /^http:\/\//i.test(route.targetUrl))) {
            warnings.push('route targetUrl uses plain http');
        }
        if (routes?.some(route => route.auth === false)) {
            warnings.push('some routes disable authentication');
        }
        return warnings;
    }

    private merge(
        current: Partial<GatewayOptions>,
        patch: Partial<GatewayOptions>,
        mergeRoutes: boolean
    ): Partial<GatewayOptions> {
        const next: Partial<GatewayOptions> = this.clone(current);
        for (const key of Object.keys(patch) as Array<keyof GatewayOptions>) {
            const value = patch[key];
            if (value === null) {
                delete next[key];
                continue;
            }
            if (value === undefined) {
                continue;
            }
            if (key === 'routes' && mergeRoutes && Array.isArray(value)) {
                next.routes = this.mergeRouteTables(next.routes ?? [], value as GatewayRouteOptions[]);
            } else {
                next[key] = this.clone(value) as any;
            }
        }
        return next;
    }

    private mergeRouteTables(current: GatewayRouteOptions[], incoming: GatewayRouteOptions[]): GatewayRouteOptions[] {
        const map = new Map<string, GatewayRouteOptions>();
        current.forEach(route => map.set(`${route.path}:${route.service ?? ''}`, route));
        incoming.forEach(route => {
            const key = `${route.path}:${route.service ?? ''}`;
            map.set(key, { ...(map.get(key) ?? {}), ...route } as GatewayRouteOptions);
        });
        return Array.from(map.values());
    }

    private diff(current: Partial<GatewayOptions>, next: Partial<GatewayOptions>): GatewayConfigDiff {
        const currentRoutes = new Map((current.routes ?? []).map(route => [routeKey(route), route]));
        const nextRoutes = new Map((next.routes ?? []).map(route => [routeKey(route), route]));
        const currentRules = new Map((current.rules ?? []).map(rule => [rule.id ?? '', rule]));
        const nextRules = new Map((next.rules ?? []).map(rule => [rule.id ?? '', rule]));

        const options: string[] = [];
        const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
        for (const key of keys) {
            if (key === 'routes' || key === 'rules') {
                continue;
            }
            if (JSON.stringify((current as any)[key]) !== JSON.stringify((next as any)[key])) {
                options.push(key);
            }
        }

        return {
            routes: compareMap(currentRoutes, nextRoutes),
            rules: compareMap(currentRules, nextRules),
            options
        };
    }

    private clone<T>(value: T): T {
        if (Array.isArray(value)) {
            return value.map(item => this.clone(item)) as any;
        }
        if (value && typeof value === 'object') {
            const out: any = {};
            for (const key of Object.keys(value as any)) {
                out[key] = this.clone((value as any)[key]);
            }
            return out;
        }
        return value;
    }
}

function routeKey(route: GatewayRouteOptions): string {
    return `${route.path}:${route.service ?? ''}`;
}

function compareMap<T>(current: Map<string, T>, next: Map<string, T>) {
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];
    next.forEach((value, key) => {
        if (!current.has(key)) {
            added.push(key);
        } else if (JSON.stringify(current.get(key)) !== JSON.stringify(value)) {
            changed.push(key);
        }
    });
    current.forEach((_value, key) => {
        if (!next.has(key)) {
            removed.push(key);
        }
    });
    return { added, removed, changed };
}
