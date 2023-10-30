import { Abstract } from '@tsdi/ioc';
import { AssetContext } from '@tsdi/endpoints';

/**
 * negotiator.
 */
@Abstract()
export abstract class Negotiator {

    abstract charsets(ctx: AssetContext, ...accepts: string[]): string[];

    abstract encodings(ctx: AssetContext, ...accepts: string[]): string[];

    abstract languages(ctx: AssetContext, ...accepts: string[]): string[];

    abstract mediaTypes(ctx: AssetContext, ...accepts: string[]): string[];
}
