import { isFunction } from './utils/lang';


/**
 * destoryable interface.
 */
export interface IDestoryable {
    destroy(): void;
    onDestroy?(callback: () => void): void;
}

export abstract class Destoryable implements IDestoryable {

    constructor() {

    }

    protected _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    get destroyed() {
        return this._destroyed;
    }

    destroy(): void {
        if (!this.destroyed) {
            this._destroyed = true;
            this.destroying();
            this.destroyCbs.forEach(cb => isFunction(cb) && cb());
            delete this.destroyCbs;
        }
    }

    protected abstract destroying();

    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }
}

export abstract class IocDestoryable extends Destoryable {
    static nonePointcut = true;
}
