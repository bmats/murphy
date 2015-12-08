beforeEach(() => {
  jasmine.addMatchers({
    toEqualInAnyOrder: () => {
      return {
        compare: function (actual, expected) {
          if (!Array.isArray(actual) || !Array.isArray(expected)) {
            return { pass: false };
          }

          if (actual.length !== expected.length) {
            return { pass: false };
          }

          const actualSorted = actual.sort();
          const expectedSorted = expected.sort();

          for (let i = 0; i < actualSorted.length; ++i) {
            if (actualSorted[i] !== expectedSorted[i]) {
              return { pass: false };
            }
          }

          return { pass: true };
        }
      };
    }
  });
});
