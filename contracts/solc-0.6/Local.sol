// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import './Imported.sol';

contract Local is Imported2 {

    struct LocalStruct {
        imported2Struct testImportedStruct;
    }

    LocalStruct localStruct;

    constructor(uint x, uint y) Imported2(x, y) public {
        localStruct.testImportedStruct.money = 0xFED;
    }

}
