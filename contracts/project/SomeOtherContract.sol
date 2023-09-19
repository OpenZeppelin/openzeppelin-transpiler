// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6;

import { ISomeInterface } from "./ISomeInterface.sol";
import { SomeLibrary } from "./SomeLibrary.sol";
import { SomeContract } from "./SomeContract.sol";

contract SomeOtherContract is SomeContract {
    function extraFunction() public returns (uint256) {
        return 42;
    }
}