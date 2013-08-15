getJasmineRequireObj().toHaveBeenCalledWith = function(j$) {

  function toHaveBeenCalledWith(util) {
    return {
      compare: function() {
        var args = Array.prototype.slice.call(arguments, 0),
          actual = args[0],
          expectedArgs = args.slice(1);

        if (!j$.isSpy(actual)) {
          throw new Error('Expected a spy, but got ' + j$.pp(actual) + '.');
        }

        return {
          pass: util.contains(actual.calls.allArgs(), expectedArgs)
        };
      },
      message: function(actual) {
        return {
          affirmative: "Expected spy " + actual.and.identity() + " to have been called.",
          negative: "Expected spy " + actual.and.identity() + " not to have been called."
        };
      }
    };
  }

  return toHaveBeenCalledWith;
};
