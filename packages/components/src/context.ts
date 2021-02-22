import { Injectable } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';

@Injectable()
export class ComponentBuildContext extends BuildContext {

    get template() {
        return this.getOptions().template;
    }
}

