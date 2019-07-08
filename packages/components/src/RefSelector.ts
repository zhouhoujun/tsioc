import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class RefSelector {
    abstract getSelector(refElement: any): string;
}
