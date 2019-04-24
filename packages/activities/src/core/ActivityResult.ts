import { InjectToken, Inject, Injectable } from '@tsdi/ioc';


export const NextToken = new InjectToken<() => Promise<void>>('next_step');


@Injectable
export class ActivityResult {
    constructor(@Inject(NextToken) protected next?: () => Promise<void>) {

    }

    private val: any;
    setValue(value: any) {
        this.val = value;
    }

    getValue(): any {
        return this.val;
    }

    getNext(): () => Promise<void> {
        return this.next;
    }

    setNext(next: () => Promise<void>) {
        this.next = next;
    }
}
