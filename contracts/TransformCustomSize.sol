// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

struct HalfASlot {
  uint256 x;
  uint128 y;
}

contract SizeDefault {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable state-variable-assignment
    uint immutable w = block.number;
    uint immutable x;
    uint constant y = 1;
    uint224 z0;
    uint256 z1;
    uint32  z2;
    HalfASlot s1;
    HalfASlot s2;
    uint64[5] a1;
    uint64[3] a2;

    constructor(uint _x) {
      x = _x;
    }
}

/// @custom:contract-size 128
contract SizeOverride {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable state-variable-assignment
    uint immutable w = block.number;
    uint immutable x;
    uint constant y = 1;
    uint224 z0;
    uint256 z1;
    uint32  z2;
    HalfASlot s1;
    HalfASlot s2;
    uint64[5] a1;
    uint64[3] a2;

    constructor(uint _x) {
      x = _x;
    }
}
