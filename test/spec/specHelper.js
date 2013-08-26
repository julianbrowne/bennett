beforeEach(function() {
  this.addMatchers({
    toBeSometing: function(thing) {
      return thing !== undefined;
    }
  });
});
