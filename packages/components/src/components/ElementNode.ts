import { Component, Input } from '../decorators';
import { CompositeNode } from '../CompositeNode';

@Component()
export class ElementNode extends CompositeNode  {
    @Input() id: string;
    @Input() name: string;
}
