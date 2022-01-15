// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './Imported.sol';

contract Local is Imported2 {
<<<<<<< HEAD
    struct LocalStruct {
        imported2Struct testImportedStruct;
    }

    LocalStruct localStruct;

    constructor(uint x, uint y) Imported2(x, y) {
        localStruct.testImportedStruct.money = 0xFED;
    }
=======
    constructor(uint x, uint y) Imported2(x, y) { }
>>>>>>> 080f60b... wip - adding testing for solc 0.8.0 and diamond storage generation
}
