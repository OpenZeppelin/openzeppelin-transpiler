pragma solidity ^0.6.5;

contract TransformImmutable {
    uint immutable x;
    constructor() public {
        x = 3;
    }
}
