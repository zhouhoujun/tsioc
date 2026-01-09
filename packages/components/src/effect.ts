import { Abstract } from '@tsdi/ioc';
// import { noReact } from './reactive';

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
    
    // 停止effect
    abstract stop(): void;
    
    // 是否活跃状态
    abstract get active(): boolean;
}
