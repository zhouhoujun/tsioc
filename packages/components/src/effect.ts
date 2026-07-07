import { Abstract } from '@tsdi/ioc';

export const noReact = Symbol('__noReact');

@Abstract()
export abstract class ReactiveEffect<T = any> {
    
    [noReact] = true;
    
    // 依赖收集
    abstract track(target: object, key: string | symbol): void;
    
    // 触发更新
    abstract trigger(target: object, key: string | symbol, newValue?: T, oldValue?: T): void;
    
    // 运行effect函数
    abstract run(fn: () => T): T;

    // 在不收集新依赖的情况下运行逻辑
    untrack<R>(fn: () => R): R {
        return fn();
    }
    
    // 停止effect
    abstract stop(): void;
    
    // 是否活跃状态
    abstract get active(): boolean;
}
