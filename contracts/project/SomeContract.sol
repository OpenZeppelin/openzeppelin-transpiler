// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6;

import { ISomeInterface } from "./ISomeInterface.sol";
import { SomeLibrary } from "./SomeLibrary.sol";

interface ISomeContract is ISomeInterface {}

contract SomeContract is ISomeContract {
    function someFunction() public override returns (bool) {
        return false;
    }

    function someOtherFunction() public override returns (bool) {
        return true;
    }

    function test(ISomeInterface other) public returns (bool) {
        return SomeLibrary.bothFunctions(this) && SomeLibrary.bothFunctions(other);
    }
}
