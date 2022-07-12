import { Abstract, Injectable } from '@tsdi/ioc';

@Abstract()
export abstract class UuidGenerator {

    abstract get uuidLen(): number;
    /**
     * generate uuid.
     *
     * @returns {string} uuid string.
     */
    abstract generate(): string;
}

/**
 * default random uuid resolver.
 */
@Injectable()
export class RandomUuidGenerator implements UuidGenerator {
    constructor() {

    }

    readonly uuidLen = 36;

    /**
     * generate uuid.
     *
     * @returns {string}
     * @memberof RandomUUID
     */
    generate(): string {
        return (this.randomS4() + this.randomS4() + '-' + this.randomS4() + '-' + this.randomS4() + '-' + this.randomS4() + '-' + this.randomS4() + this.randomS4() + this.randomS4())
    }

    protected randomS4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }
}
