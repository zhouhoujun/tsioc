import { Abstract, Inject, ContainerToken, Injectable, IIocContainer} from '../src';

@Injectable
export class Home {
    getAddress() {
        return 'home';
    }
}

@Abstract()
export abstract class Animal {

    @Inject
    home: Home;

    @Inject(ContainerToken)
    container: IIocContainer;

    back() {
        return 'back ' + this.home.getAddress();
    }
}

@Injectable
export class Person extends Animal {

}
