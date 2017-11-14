import { IContainer } from './IContainer';
import { Container } from './Container';

export class ContainerBuilder {

    build(): IContainer {
        let container = new Container();
        return container;
    }
}
