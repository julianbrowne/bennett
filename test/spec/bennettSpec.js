describe("Bennett", function() { 


  beforeEach(function() { 
  });

  it("should be present", function() { 
    expect("string").toBeSometing("string");
  });

  describe("some sub category", function() { 
    beforeEach(function() { 
    });

    it("should do something", function() { 
      expect(false).toBeFalsy();
      expect(true).not.toBeFalsy();
    });

  });
});
