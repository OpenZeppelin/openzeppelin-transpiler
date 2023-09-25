// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ISomeInterface } from "./ISomeInterface.sol";
import { SomeLibrary } from "./SomeLibrary.sol";

interface ISomeContract is ISomeInterface {}

error Error1(uint256);

function freeFn_1(uint256 x) pure { revert Error1(x); }

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
