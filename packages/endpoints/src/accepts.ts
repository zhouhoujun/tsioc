import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class AcceptsPriority {
    abstract priority(aspect: string | string[], accepts: string[], type: 'lang' | 'media' | 'charsets' | 'encodings'): string[];
}
