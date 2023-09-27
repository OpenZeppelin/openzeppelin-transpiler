// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ISomeInterface } from "./ISomeInterface.sol";
import { SomeLibrary } from "./SomeLibrary.sol";
import { SomeStatelessContract } from "./SomeStatelessContract.sol";

interface ISomeContract is ISomeInterface {}

error Error1(uint256);

function freeFn_1(uint256 x) pure { revert Error1(x); }

struct SomeStruct {
    uint member;
}

contract SomeBaseContract {
    function test(ISomeInterface other) public virtual returns (bool) {
        return SomeLibrary.bothFunctions(other);
    }
}

contract SomeContract is ISomeContract, SomeBaseContract {
    SomeStruct s;

    /// @inheritdoc ISomeInterface
    function someFunction() public pure override returns (bool) {
        return false;
    }

    /// @inheritdoc ISomeInterface
    function someOtherFunction() public pure override returns (bool) {
        return true;
    }

    /// @inheritdoc SomeBaseContract
    function test(ISomeInterface other) public override returns (bool) {
        return SomeLibrary.bothFunctions(this) && super.test(other);
    }
}
