import { Component } from '../core';
import { Element } from './Element';

@Component()
export class ContentElement extends Element {
    elements: Element[];

    constructor() {
        super();
        this.elements = [];
    }

    add(...elements: Element[]): this {
        this.elements.push(...elements);
        return this;
    }
}
