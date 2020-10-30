pragma solidity ^0.6;

contract A {
    constructor(uint) public {}
}

contract B is A(4) {}
