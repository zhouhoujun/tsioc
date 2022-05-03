import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class Negotiator {

    abstract charsets(...accepts: string[]): string[];

    abstract encodings(...accepts: string[]): string[];

    abstract languages(...accepts: string[]): string[];

    abstract mediaTypes(...accepts: string[]): string[];
}
