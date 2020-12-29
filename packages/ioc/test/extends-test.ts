import { Abstract, Inject, IOC_CONTAINER, Injectable, IContainer} from '../src';

@Injectable()
export class Home {
    getAddress() {
        return 'home';
    }
}

@Abstract()
export abstract class Animal {

    @Inject()
    home: Home;

    @Inject(IOC_CONTAINER)
    container: IContainer;

    back() {
        return 'back ' + this.home.getAddress();
    }
}

@Injectable()
export class Person extends Animal {

}
