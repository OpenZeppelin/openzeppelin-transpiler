// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './Imported.sol';

contract Local is Imported2 {
    struct LocalStruct {
        imported2Struct testImportedStruct;
    }

    LocalStruct localStruct;

    constructor(uint x, uint y) Imported2(x, y) {
        localStruct.testImportedStruct.money = 0xFED;
    }
}
