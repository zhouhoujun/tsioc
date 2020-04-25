import { isFunction } from './utils/lang';


/**
 * destoryable interface.
 */
export interface IDestoryable {
    readonly destroyed: boolean;
    destroy(): void;
    onDestroy?(callback: () => void): void;
}

export abstract class Destoryable implements IDestoryable {

    constructor() {

    }

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    get destroyed() {
        return this._destroyed;
    }

    destroy(): void {
        if (!this.destroyed) {
            this._destroyed = true;
            this.destroying();
            this.destroyCbs.forEach(cb => isFunction(cb) && cb());
            this.destroyCbs.length = 0;
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
    /**
     * none poincut for aop.
     */
    static d0NPT = true;
}
