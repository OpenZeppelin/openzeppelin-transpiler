// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6;

import { ISomeInterface } from "./ISomeInterface.sol";
import { SomeLibrary } from "./SomeLibrary.sol";

contract SomeContract is ISomeInterface {
    function someFunction() public override returns (bool) {
        return false;
    }

    function someOtherFunction() public override returns (bool) {
        return true;
    }
}
