pragma solidity ^0.6;

contract A {
  constructor(uint x) public {}
}

contract B is A {
	constructor(uint x) A(x) public {}
}

interface IFoo {
    function mint() external returns (uint);
}

contract E is B {
	constructor(IFoo t) B(t.mint()) public {}
}
