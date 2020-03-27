const UNUSABLE_INTERPOLATION_REGEXPS = [
    /^\s*$/,        // empty
    /[<>]/,         // tag
    /^[{}]$/,       // i18n expansion
    /&(#|[a-z])/i,  // character reference,
    /^\/\//,        // comment
];

export function assertInterpolationSymbols(identifier: string, value: any): void {
    if (value != null && !(Array.isArray(value) && value.length === 2)) {
        throw new Error(`Expected '${identifier}' to be an array, [start, end].`);
    } else if (value != null) {
        const start = value[0] as string;
        const end = value[1] as string;
        // Check for unusable interpolation symbols
        UNUSABLE_INTERPOLATION_REGEXPS.forEach(regexp => {
            if (regexp.test(start) || regexp.test(end)) {
                throw new Error(`['${start}', '${end}'] contains unusable interpolation symbol.`);
            }
        });
    }
}

export class InterpolationConfig {
    static fromArray(markers: [string, string] | null): InterpolationConfig {
        if (!markers) {
            return DEFAULT_INTERPOLATION_CONFIG;
        }

        assertInterpolationSymbols('interpolation', markers);
        return new InterpolationConfig(markers[0], markers[1]);
    }

    constructor(public start: string, public end: string) { }
}

export const DEFAULT_INTERPOLATION_CONFIG: InterpolationConfig =
    new InterpolationConfig('{{', '}}');
