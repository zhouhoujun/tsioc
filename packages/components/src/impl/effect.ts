import { ReactiveEffect, ReactiveScope, noReact } from '../effect';

/**
 * Upper bound on deferred re-entrancy passes. A healthy synchronous cascade
 * settles in a single pass (triggered effects are not themselves running);
 * only a self-feeding write cycle needs extra passes, and those must be bounded
 * so a single `set` can never recurse without limit.
 */
const MAX_REENTRANCY_PASSES = 20;

let reactiveBatchDepth = 0;
const batchedEffects = new Set<DefaultReactiveEffect>();

/**
 * Coalesce reactive writes into one effect pass. Every trigger inside `fn`
 * queues its dependent effect functions; at the end each effect runs once.
 * This is for full-view swaps (tab switches) that assign many state fields in
 * one transaction; ordinary writes keep the existing synchronous semantics.
 */
export function batchReactiveUpdates<T>(fn: () => T): T {
    reactiveBatchDepth += 1;
    try {
        return fn();
    } finally {
        reactiveBatchDepth -= 1;
        if (reactiveBatchDepth === 0 && batchedEffects.size) {
            const effects = Array.from(batchedEffects);
            batchedEffects.clear();
            effects.forEach(effect => effect.flushBatchedEffects());
        }
    }
}

export class DefaultReactiveEffect implements ReactiveEffect {

    private depsMap = new WeakMap<any, Map<string | symbol, Set<Function>>>();
    private activeEffects = new Set<Function>();
    private pendingEffects = new Set<Function>();
    private runningDepth = 0;
    private flushing = false;
    private scheduler?: (fn: Function) => void;
    private isActive = true;

    // Bindings created for one embedded view run under that view's scope, so
    // their dependency functions can be removed when the view is destroyed.
    private currentScope?: ReactiveScope;
    private scopeByFn = new WeakMap<Function, ReactiveScope>();

    [noReact] = true;

    constructor(options?: { scheduler?: (fn: Function) => void }) {
        this.scheduler = options?.scheduler;
    }

    createScope(): ReactiveScope {
        return new DefaultReactiveScope(this);
    }

    track(target: any, key: string | symbol): void {
        // Reads outside any running effect cannot be dependents; skip so plain
        // state traversal never allocates dependency maps.
        if (this.activeEffects.size === 0) {
            return;
        }
        if (!this.depsMap.has(target)) {
            this.depsMap.set(target, new Map());
        }

        let targetMap = this.depsMap.get(target);
        if (!targetMap) {
            return;
        }

        let deps = targetMap.get(key);
        if (!deps) {
            deps = new Set<Function>();
            targetMap.set(key, deps);
        }

        // 添加当前激活的effect
        const scope = this.currentScope;
        this.activeEffects.forEach(effect => {
            deps!.add(effect);
            if (scope) {
                scope.record(target, key, effect);
            }
        });
    }

    // 增强trigger方法支持生命周期标记
    trigger(target: any, key: string | symbol, isLifecycleHook = false): void {
        const targetMap = this.depsMap.get(target);
        if (!targetMap) return;

        const deps = targetMap.get(key);
        if (deps) {
            if (reactiveBatchDepth > 0 && !isLifecycleHook) {
                deps.forEach(effectFn => this.pendingEffects.add(effectFn));
                batchedEffects.add(this);
                return;
            }
            // 如果是生命周期钩子变化，立即执行
            // 必须经由 run() 执行，以便重跑期间 activeEffects 生效，
            // 使重跑过程中首次读取的依赖也能被 track 收集。
            const runOne = (effectFn: Function) => {
                if (this.activeEffects.has(effectFn)) {
                    this.pendingEffects.add(effectFn);
                } else {
                    this.run(effectFn);
                }
            };
            const run = () => {
                if (deps.size === 1) {
                    runOne(deps.values().next().value as Function);
                    return;
                }
                Array.from(deps).forEach(runOne);
            };
            isLifecycleHook ? run() : (this.scheduler ? this.scheduler(run) : run());
        }
    }


    // 添加effect函数
    run(fn: Function, scope?: ReactiveScope) {
        const resolvedScope = scope ?? this.currentScope ?? this.scopeByFn.get(fn);
        if (resolvedScope) {
            this.scopeByFn.set(fn, resolvedScope);
        }
        const previousScope = this.currentScope;
        this.currentScope = resolvedScope;

        this.runningDepth += 1;
        this.activeEffects.add(fn);
        try {
            return fn();
        } finally {
            this.activeEffects.delete(fn);
            this.currentScope = previousScope;
            this.runningDepth -= 1;
            if (this.runningDepth === 0 && !this.flushing && this.pendingEffects.size > 0) {
                this.flushPendingEffects();
            }
        }
    }

    /** Run arbitrary setup work under a scope without registering it as an effect. */
    runInScope<T>(scope: ReactiveScope, fn: () => T): T {
        const previousScope = this.currentScope;
        this.currentScope = scope;
        try {
            return fn();
        } finally {
            this.currentScope = previousScope;
        }
    }

    /** Flush effects queued by {@link batchReactiveUpdates}. */
    flushBatchedEffects(): void {
        if (!this.flushing && this.pendingEffects.size > 0) {
            this.flushPendingEffects();
        }
    }

    private flushPendingEffects(): void {
        if (this.flushing) {
            return;
        }
        this.flushing = true;
        try {
            for (let pass = 0; pass < MAX_REENTRANCY_PASSES && this.pendingEffects.size > 0; pass++) {
                const jobs = Array.from(this.pendingEffects);
                this.pendingEffects.clear();
                jobs.forEach(fn => {
                    if (!this.activeEffects.has(fn)) {
                        this.run(fn);
                    }
                });
            }
            this.pendingEffects.clear();
        } finally {
            this.flushing = false;
        }
    }

    untrack<R>(fn: () => R): R {
        // Swap the active set instead of copying it: collect nothing while
        // `fn` runs, then restore the outer set as-is.
        const active = this.activeEffects;
        this.activeEffects = new Set<Function>();
        try {
            return fn();
        } finally {
            this.activeEffects = active;
        }
    }

    /**
     * Remove one binding function from a target/key dependency set. Called by a
     * view scope on destroy; safe to call after the effect was stopped.
     */
    removeDependency(target: object, key: string | symbol, fn: Function): void {
        this.scopeByFn.delete(fn);
        const targetMap = this.depsMap.get(target);
        const deps = targetMap?.get(key);
        if (!deps) {
            return;
        }
        deps.delete(fn);
        if (deps.size === 0) {
            targetMap!.delete(key);
            if (targetMap!.size === 0) {
                this.depsMap.delete(target);
            }
        }
    }

    // 清理特定target的依赖
    cleanup(target: any) {
        this.depsMap.delete(target);
    }

    // 清理所有依赖
    cleanupAll() {
        this.depsMap = new WeakMap();
    }

    stop(): void {
        if (this.isActive) {
            this.cleanupAll();
            this.isActive = false;
        }
    }

    get active(): boolean {
        return this.isActive;
    }
}

/**
 * Dependency ownership for one embedded view. It records only the functions
 * that were actually registered while the view was being created/re-run; no
 * values are cached here.
 */
export class DefaultReactiveScope implements ReactiveScope {
    private deps = new Map<object, Map<string | symbol, Set<Function>>>();
    private disposed = false;

    constructor(private effect: DefaultReactiveEffect) { }

    run<T>(fn: () => T): T {
        return this.effect.runInScope(this, fn);
    }

    record(target: object, key: string | symbol, fn: Function): void {
        if (this.disposed) {
            return;
        }
        let keys = this.deps.get(target);
        if (!keys) {
            keys = new Map<string | symbol, Set<Function>>();
            this.deps.set(target, keys);
        }
        let fns = keys.get(key);
        if (!fns) {
            fns = new Set<Function>();
            keys.set(key, fns);
        }
        fns.add(fn);
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.deps.forEach((keys, target) => {
            keys.forEach((fns, key) => {
                fns.forEach(fn => this.effect.removeDependency(target, key, fn));
            });
        });
        this.deps.clear();
    }
}
