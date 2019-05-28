import { Component, Input } from '../core';

@Component()
export class Element {
    @Input()
    name: string;

    scope: any;

    scopes: any[];
}
