import { Abstract } from '@tsdi/ioc';
import { RequestContext } from './RequestContext';

/**
 * negotiator.
 */
@Abstract()
export abstract class Negotiator {

    abstract charsets(ctx: RequestContext, ...accepts: string[]): string[];

    abstract encodings(ctx: RequestContext, ...accepts: string[]): string[];

    abstract languages(ctx: RequestContext, ...accepts: string[]): string[];

    abstract mediaTypes(ctx: RequestContext, ...accepts: string[]): string[];
}
