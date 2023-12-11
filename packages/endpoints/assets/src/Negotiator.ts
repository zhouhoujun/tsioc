import { TransportContext } from '@tsdi/endpoints';
import { Abstract } from '@tsdi/ioc';

/**
 * negotiator.
 */
@Abstract()
export abstract class Negotiator {

    abstract charsets(ctx: TransportContext, ...accepts: string[]): string[];

    abstract encodings(ctx: TransportContext, ...accepts: string[]): string[];

    abstract languages(ctx: TransportContext, ...accepts: string[]): string[];

    abstract mediaTypes(ctx: TransportContext, ...accepts: string[]): string[];
}
