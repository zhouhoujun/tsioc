import { Activity } from './Activity';
import { NodeRef, OnDestory, IPipeTransform } from '@tsdi/components';
import { ActivityContext } from './ActivityContext';



export class ActivityRef<T extends Activity = Activity> extends NodeRef<T> {

    constructor(public node: T, private inPipe?: IPipeTransform, private outPipe?: IPipeTransform) {
        super(node);
    }

    execute(ctx: ActivityContext) {
        this.node.run(ctx);
    }

    destroy(): void {
        let node = this.node as T & OnDestory;
        if (node.onDestory) {
            node.onDestory();
        }
    }
}

