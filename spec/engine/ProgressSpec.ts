import Progress from '../../src/engine/Progress';

describe('Progress', () => {

  describe('advance()', () => {
    it('goes to the next step', () => {
      const prog = new Progress({
        step1: 0.5,
        step2: 0.5
      });
      expect(prog.advance().value).toBe(0.5);
    });

    it('resets the fraction', () => {
      const prog = new Progress({
        step1: 0.5,
        step2: 0.5
      });
      expect(prog.current(0.5).advance().value).toBe(0.5);
    });
  });

  describe('reset()', () => {
    it('restarts at 0', () => {
      const prog = new Progress({
        step1: 0.5,
        step2: 0.5
      });
      expect(prog.value).toBe(0);
    });
  });

  describe('current()', () => {
    it('sets the current fraction', () => {
      const prog = new Progress({
        step1: 0.5,
        step2: 0.5
      });
      expect(prog.current(0.5).value).toBe(0.25);
    })
  });

  describe('value()', () => {
    it('computes the current progress', () => {
      const prog = new Progress({
        step1: 0.5,
        step2: 0.5
      });
      expect(prog.advance().current(0.5).value).toBe(0.75);
    })
  });
});
