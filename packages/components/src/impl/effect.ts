import { ReactiveEffect } from '../ReactiveEffect';

export class DefaultReactiveEffect extends ReactiveEffect {
    private depsMap = new WeakMap<any, Map<string | symbol, Set<Function>>>();
    private activeEffects = new Set<Function>();
    private scheduler?: (fn: Function) => void;

    constructor(options?: { scheduler?: (fn: Function) => void }) {
        super();
        this.scheduler = options?.scheduler;
    }

    track(target: any, key: string | symbol): void {
        if (!this.depsMap.has(target)) {
            this.depsMap.set(target, new Map());
        }

        const targetMap = this.depsMap.get(target);
        if (!targetMap) return;

        if (!targetMap.has(key)) {
            targetMap.set(key, new Set());
        }

        const deps = targetMap.get(key);
        if (deps) {
            // 添加当前激活的effect
            this.activeEffects.forEach(effect => deps.add(effect));
        }
    }

    // 增强trigger方法支持生命周期标记
    trigger(target: any, key: string | symbol, isLifecycleHook = false): void {
        const targetMap = this.depsMap.get(target);
        if (!targetMap) return;

        const deps = targetMap.get(key);
        if (deps) {
            // 如果是生命周期钩子变化，立即执行
            const run = () => deps.forEach(effectFn => effectFn());
            isLifecycleHook ? run() : (this.scheduler ? this.scheduler(run) : run());
        }
    }


    // 添加effect函数
    run(fn: Function) {
        try {
            this.activeEffects.add(fn);
            return fn();
        } finally {
            this.activeEffects.delete(fn);
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
}
