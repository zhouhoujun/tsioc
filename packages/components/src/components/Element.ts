import { Component, Input } from '../decorators';

@Component()
export class Element {
    @Input()
    name: string;

    scope: any;

    scopes: any[];
}
