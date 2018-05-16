import { Registration } from './Registration';

export class InjectToken<T> extends Registration<T> {

    constructor(desc: string | symbol) {
        super(desc, '');
    }
}
