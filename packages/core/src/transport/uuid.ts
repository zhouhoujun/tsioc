import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class UUIDFactory {
    /**
     * generate uuid.
     *
     * @returns {string} uuid string.
     */
    abstract generate(): string;
}
