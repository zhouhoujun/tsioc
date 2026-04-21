export declare const noReact: unique symbol;
export declare abstract class ReactiveEffect<T = any> {
    [noReact]: boolean;
    abstract track(target: object, key: string | symbol): void;
    abstract trigger(target: object, key: string | symbol, newValue?: T, oldValue?: T): void;
    abstract run(fn: () => T): T;
    abstract stop(): void;
    abstract get active(): boolean;
}
