import { Inject, Type } from '@tsdi/ioc';
import { REQUEST_BODY, RouteMapping } from '@tsdi/boot';
import { RendererFactory } from './renderer';
import { IElement } from '../interfaces/node';
import { getComponentDef } from '../../reflect';

@RouteMapping('/render/component')
export class RenderComponent {

    @Inject()
    renderFac: RendererFactory;

    @RouteMapping('/:type', 'create')
    render(type: string, @Inject(REQUEST_BODY) body: { componentType: Type, hostElement?: IElement }) {
        let renderer = this.renderFac.create(body.hostElement, type);
        const compDef =  getComponentDef(body.componentType);
        const compTag = compDef.selectors?.[0]?.[0];

        
    }

    @RouteMapping('/:type', 'update')
    refresh(type: string,  @Inject(REQUEST_BODY) body: { componentType: Type, hostElement?: IElement }) {
        
    }

}
