import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ConsoleAnimationClock } from '../src';

@Suite('console animation clock')
export class ConsoleAnimationClockTest {
    @Test('ticks while subscribed and stops after the last unsubscribe')
    async drivesAndStops() {
        const clock = new ConsoleAnimationClock();
        let ticks = 0;
        const listener = () => ticks += 1;
        clock.subscribe(listener);
        await new Promise(resolve => setTimeout(resolve, 240));
        expect(ticks).toBeGreaterThan(0);
        clock.unsubscribe(listener);
        const stoppedAt = ticks;
        await new Promise(resolve => setTimeout(resolve, 160));
        expect(ticks).toEqual(stoppedAt);
        clock.onDestroy();
    }
}
