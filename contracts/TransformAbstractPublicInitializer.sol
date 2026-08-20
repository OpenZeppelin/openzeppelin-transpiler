pragma solidity ^0.6;

abstract contract AbstractWithArgs {
    constructor(uint x) public {}
}

contract ConcreteWithArgs is AbstractWithArgs {
    constructor(uint x) public AbstractWithArgs(x) {}
}
