import { Metadata } from './metadatas';
import { Handler } from '../utils/lang';

/**
 * args iterator context.
 *
 * @export
 * @class ArgsContext
 */
export class ArgsContext<T extends Metadata = Metadata> {
    constructor(public args: any[]) {
        this.currIndex = 0;
        this.metadata = {} as T;
    }
    metadata: T;
    currIndex: number;

    get currArg() {
        if (this.args.length) {
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
        return this.currIndex > 0 ? this.metadata : null;
    }

    isCompeted(): boolean {
        return this.currIndex >= this.args.length;
    }
}

/**
 * args iterator action.
 */
export type ArgsIteratorAction<T extends Metadata = Metadata> = Handler<ArgsContext<T>>;
