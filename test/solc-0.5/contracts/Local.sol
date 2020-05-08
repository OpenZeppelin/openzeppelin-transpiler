pragma solidity ^0.5.0;

import './Imported.sol';

contract Local is Imported2 {
    constructor(uint x, uint y) Imported2(x, y) public { }
}
