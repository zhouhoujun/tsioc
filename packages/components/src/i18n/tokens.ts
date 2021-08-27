import { Abstract, Token, tokenId } from '@tsdi/ioc';

/**
 * locale id.
 */
export const LOCALE_ID: Token<string> = tokenId<string>('LOCALE_ID');


@Abstract()
export abstract class Localization  {
    abstract getPluralCategory(value: any, locale?: string): string;
}



export function getPluralCategory(
    value: number, cases: string[], localization: Localization, locale?: string): string {
    let key = `=${value}`;

    if (cases.indexOf(key) > -1) {
        return key;
    }

    key = localization.getPluralCategory(value, locale);

    if (cases.indexOf(key) > -1) {
        return key;
    }

    if (cases.indexOf('other') > -1) {
        return 'other';
    }

    throw new Error(`No plural message found for value "${value}"`);
}
