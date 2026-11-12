import {
    Attribute,
    Component,
    ElementRef,
    EventEmitter,
    NodeType,
    PROJECTION_NODES,
    RNode
} from '@tsdi/components';
import { Module, Optional } from '@tsdi/ioc';
import { ThemeService } from './theme';

interface ProjectionNode extends RNode {
    tagName?: string;
    textContent?: string | null;
    [PROJECTION_NODES]?: RNode[];
}

@Module({
    providers: [ThemeService]
})
export class BaseComponentsModule {}
