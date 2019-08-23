import { Metadate } from '../metadatas';
import { lang } from '../utils';

/**
 * args iterator context.
 *
 * @export
 * @class ArgsIteratorContext
 * @extends {IocActionContext}
 */
export class ArgsIteratorContext<T extends Metadate = Metadate> {
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
export type ArgsIteratorAction<T extends Metadate = Metadate> = lang.IAction<ArgsIteratorContext<T>>;
