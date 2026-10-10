import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { JSDOM } from 'jsdom';
import { DomTranscriptFollower } from '../src/scroll-follow';

function stubMetrics(element: HTMLElement, scrollHeight: number, clientHeight: number): void {
    Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true });
    Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true });
}

@Suite('dom transcript follower')
export class DomTranscriptFollowerTest {
    @Test('counts new content while scrolled away and clears on jump to bottom')
    indicator() {
        const dom = new JSDOM('<!DOCTYPE html><body><div id="t"></div><button id="i"></button></body>');
        const transcript = dom.window.document.getElementById('t') as HTMLElement;
        const indicator = dom.window.document.getElementById('i') as HTMLElement;
        stubMetrics(transcript, 1000, 100);

        const follower = new DomTranscriptFollower(transcript, indicator);
        follower.attach();
        expect(follower.following).toEqual(true);
        expect(indicator.style.display).toEqual('none');

        follower.wheel(-200);
        expect(follower.following).toEqual(false);

        // Content grows while scrolled away: count rises and the indicator shows.
        stubMetrics(transcript, 1200, 100);
        follower.onContentGrew();
        expect(follower.newItemCount).toEqual(1);
        expect(indicator.style.display).not.toEqual('none');
        expect(indicator.textContent).toContain('1 new messages');

        follower.onContentGrew();
        expect(follower.newItemCount).toEqual(2);
        expect(indicator.textContent).toContain('2 new messages');

        follower.resumeFollow();
        expect(follower.following).toEqual(true);
        expect(follower.newItemCount).toEqual(0);
        expect(indicator.style.display).toEqual('none');
    }

    @Test('scrolling back to the bottom resumes following')
    scrollToBottomResumes() {
        const dom = new JSDOM('<!DOCTYPE html><body><div id="t"></div><button id="i"></button></body>');
        const transcript = dom.window.document.getElementById('t') as HTMLElement;
        const indicator = dom.window.document.getElementById('i') as HTMLElement;
        stubMetrics(transcript, 1000, 100);

        const follower = new DomTranscriptFollower(transcript, indicator);
        follower.attach();
        follower.wheel(-300);
        expect(follower.following).toEqual(false);

        // User scrolls to the bottom (simulated): sync sees the bottom and resumes.
        transcript.scrollTop = 900;
        follower.sync();
        expect(follower.following).toEqual(true);
        follower.detach();
    }
}
