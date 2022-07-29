import { Abstract } from '@tsdi/ioc';
import { Duplex } from 'readable-stream';

@Abstract()
export abstract class StreamBuilder {
    abstract create(): Duplex;
}
