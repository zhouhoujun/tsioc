import { OnDestroy } from '../destroy';
import { ApplicationEventMulticaster } from '../events';
import { Injector, Platform } from '../injector';
import { LifecycleHooks, LifecycleHooksResolver } from '../lifecycle';
import { Token } from '../tokens';
import { isFunction } from '../utils/chk';




export class ModuleLifecycleHooks extends LifecycleHooks {

    applicationStarted = false;

    private _destrories: Set<OnDestroy>;
    constructor(protected eventMulticaster: ApplicationEventMulticaster) {
        super()
        this._destrories = new Set()
    }

    get destroyable(): boolean {
        return this.platform ? this.platform.modules.size < 1 : true
    }

    async dispose(): Promise<void> {
        if (this.destroyable) return;
        if (this.platform) {
            const platform = this.platform;
            this.platform = null!;
            await Promise.all(Array.from(platform.modules.values())
                .reverse()
                .map(m => m.lifecycle.dispose()))
        }
    }

   

    register(target: any, token: Token): void {
        const { onDestroy } = (target as OnDestroy);
        if (isFunction(onDestroy)) {
            this.regDestory(target)
        }
    }

    clear(): void {
        this._destrories.clear()
    }

    runDestroy(): void {
        this._destrories.forEach(d => d?.onDestroy())
    }


    protected regDestory(hook: OnDestroy): void {
        this._destrories.add(hook)
    }
}


export class ModuleLifecycleHooksResolver implements LifecycleHooksResolver {
    resolve(plaform?: Platform): LifecycleHooks {
        return new ModuleLifecycleHooks(plaform)
    }
}