import { AssetContext } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class Negotiator {

    abstract charsets(ctx: AssetContext, ...accepts: string[]): string[];

    abstract encodings(ctx: AssetContext, ...accepts: string[]): string[];

    abstract languages(ctx: AssetContext, ...accepts: string[]): string[];

    abstract mediaTypes(ctx: AssetContext, ...accepts: string[]): string[];
}
