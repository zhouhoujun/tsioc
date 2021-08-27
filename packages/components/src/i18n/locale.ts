import { Inject, Injectable } from '@tsdi/ioc';
import { LOCALE_ID, Localization } from './tokens';

/* Returns the plural case based on the locale
*
* @publicApi
*/
@Injectable(Localization)
export class LocaleLocalization extends Localization {
    constructor(@Inject(LOCALE_ID) protected locale: string) {
        super();
    }

    override getPluralCategory(value: any, locale?: string): string {
        const plural = getLocalePluralCase(locale || this.locale)(value);

        switch (plural) {
            case Plural.Zero:
                return 'zero';
            case Plural.One:
                return 'one';
            case Plural.Two:
                return 'two';
            case Plural.Few:
                return 'few';
            case Plural.Many:
                return 'many';
            default:
                return 'other';
        }
    }
}

export enum Plural {
    Zero = 0,
    One = 1,
    Two = 2,
    Few = 3,
    Many = 4,
    Other = 5,
}
