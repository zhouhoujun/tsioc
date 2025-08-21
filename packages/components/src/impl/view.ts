import { ReactiveEffect } from '../ReactiveEffect';
import { ViewRef } from '../refs/view';
import { Node } from '../renderer/Node';

export class RootViewRef extends ViewRef {

    get destroyed(): boolean {
        throw new Error('Method not implemented.');
    }
    destroy(): void {
        throw new Error('Method not implemented.');
    }
    onDestroy(callback: () => void): void {
        throw new Error('Method not implemented.');
    }
    
    constructor(readonly rootNodes: Node[], readonly context: any, readonly effect: ReactiveEffect) {
        super()
    }

}