pragma solidity ^0.6;

contract AA {
  constructor(uint x) public {}
}

contract BB is AA {
  constructor(uint x) AA(x) public {}
}

interface IFoo {
    function mint() external returns (uint);
}

contract E is BB {
  constructor(IFoo t) BB(t.mint()) public {}
}
