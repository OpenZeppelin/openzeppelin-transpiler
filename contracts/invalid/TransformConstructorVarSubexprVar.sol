pragma solidity ^0.6;

contract A {
  constructor(uint x) public {}
}

contract B is A {
  constructor(uint y) A(y + 1) public {}
}

contract C is B {
  constructor(uint z) B(z) public {}
}
