// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ISomeInterface } from "./ISomeInterface.sol";

library SomeLibrary {
    function bothFunctions(ISomeInterface instance) internal returns (bool) {
        return instance.someFunction() && instance.someOtherFunction();
    }
}
