import { Activity } from './Activity';
import { NodeRef, OnDestory, IPipeTransform } from '@tsdi/components';



export class ActivityRef<T extends Activity = Activity> extends NodeRef<T> {

    constructor(public node: T, private inPipe?: IPipeTransform, private outPipe?: IPipeTransform) {
        super(node);
    }

    execute()

    destroy(): void {
        let node = this.node as T & OnDestory;
        if (node.onDestory) {
            node.onDestory();
        }
    }
}

