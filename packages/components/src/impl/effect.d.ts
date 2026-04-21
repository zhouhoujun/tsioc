import { ReactiveEffect, noReact } from '../effect';
export declare class DefaultReactiveEffect implements ReactiveEffect {
    private depsMap;
    private activeEffects;
    private scheduler?;
    private isActive;
    [noReact]: boolean;
    constructor(options?: {
        scheduler?: (fn: Function) => void;
    });
    track(target: any, key: string | symbol): void;
    trigger(target: any, key: string | symbol, isLifecycleHook?: boolean): void;
    run(fn: Function): any;
    cleanup(target: any): void;
    cleanupAll(): void;
    stop(): void;
    get active(): boolean;
}
