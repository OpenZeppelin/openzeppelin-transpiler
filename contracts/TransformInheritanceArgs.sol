pragma solidity ^0.6;

contract A {
    constructor(uint) public {}
}

contract B is A(4) {

    modifier hasModifier (){
        _;
    }
    
    modifier hasModifierArgument(uint b) {
        _;
    }

    constructor (uint b) public hasModifier hasModifierArgument(b) {}
}
