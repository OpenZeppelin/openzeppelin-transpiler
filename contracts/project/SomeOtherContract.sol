// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ISomeInterface } from "./ISomeInterface.sol";
import { SomeLibrary } from "./SomeLibrary.sol";
import { ISomeContract, SomeContract } from "./SomeContract.sol";

contract SomeOtherContract is SomeContract {
    function extraFunction() public returns (uint256) {
        return 42;
    }
}
