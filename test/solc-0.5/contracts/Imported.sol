pragma solidity ^0.5.0;

contract Imported1 {
  constructor(uint256 x, uint256 y) public { }
}

contract Imported2 is Imported1 {
  constructor(uint256 x, uint256 y) Imported1(x, y) public { }
}
