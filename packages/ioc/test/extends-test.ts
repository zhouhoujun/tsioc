import { Abstract, Inject, CONTAINER, Injectable, IContainer} from '../src';

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

    @Inject(CONTAINER)
    container: IContainer;

    back() {
        return 'back ' + this.home.getAddress();
    }
}

@Injectable()
export class Person extends Animal {

}
