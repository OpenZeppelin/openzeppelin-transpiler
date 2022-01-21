pragma solidity ^0.6;

contract FooWithArgs {
    constructor(uint x, uint y) public {}
}

contract FooWithArgs2 {
	modifier hasModifierArguments(uint x) {
		_;
	}
    constructor(uint x, uint y) public hasModifierArguments(x) {}
}
