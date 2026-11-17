import { Abstract } from '@tsdi/ioc';

export const noReact = Symbol('__noReact');

/**
 * Dependency ownership for one view. Bindings are created inside a scope so
 * destroying the view can remove exactly the functions they registered,
 * instead of leaving dead bindings in the effect dependency map forever.
 */
export interface ReactiveScope {
    run<T>(fn: () => T): T;
    record(target: object, key: string | symbol, fn: Function): void;
    dispose(): void;
}

export const NOOP_SCOPE: ReactiveScope = {
    run: fn => fn(),
    record: () => undefined,
    dispose: () => undefined
};

@Abstract()
export abstract class ReactiveEffect<T = any> {

    [noReact] = true;

    // 依赖收集
    abstract track(target: object, key: string | symbol): void;

    // 触发更新
    abstract trigger(target: object, key: string | symbol, newValue?: T, oldValue?: T): void;

    // 运行effect函数
    abstract run(fn: () => T, scope?: ReactiveScope): T;

    // 创建一个可随视图销毁的依赖作用域
    createScope(): ReactiveScope {
        return NOOP_SCOPE;
    }

    // 在不收集新依赖的情况下运行逻辑
    untrack<R>(fn: () => R): R {
        return fn();
    }

    // 停止effect
    abstract stop(): void;

    // 是否活跃状态
    abstract get active(): boolean;
}
