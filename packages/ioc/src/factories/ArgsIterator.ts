import { Metadate } from '../decor/metadatas';
import { Handler } from '../utils/lang';

/**
 * args iterator context.
 *
 * @export
 * @class ArgsContext
 */
export class ArgsContext<T extends Metadate = Metadate> {
    constructor(public args: any[]) {
        this.currIndex = 0;
    }
    metadata: T;
    currIndex: number;

    get currArg() {
        if (this.args.length) {
            if (!this.metadata) {
                this.metadata = {} as T;
            }
            return this.args[this.currIndex];
        }
        return null;
    }

    next(next: () => void, checkNextArg = true) {
        if (checkNextArg) {
            this.currIndex++;
        }
        if (!this.isCompeted()) {
            next();
        }
    }

    getMetadate() {
        return this.metadata;
    }

    isCompeted(): boolean {
        return this.currIndex >= this.args.length;
    }
}

/**
 * args iterator action.
 */
export type ArgsIteratorAction<T extends Metadate = Metadate> = Handler<ArgsContext<T>>;
