// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

enum SomeEnum {
  One,
  Two,
  Three
}

struct OneAndAHalfSlot {
  uint256 x;
  uint128 y;
}

contract SizeDefault {
  /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
  uint immutable w1 = block.number;
  /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
  uint immutable w2 = block.timestamp;
  uint immutable x; // slot 0 (after conversion to private)
  uint constant y = 1;
  uint224 z0; // slot 1
  uint256 z1; // slot 2
  uint32 z2; // slot 3
  OneAndAHalfSlot s1; // slot 4&5
  OneAndAHalfSlot s2; // slot 6&7
  uint32 z3; // slot 8
  uint32 z4; // slot 8
  uint32 z5; // slot 8
  uint64[5] a1; // slot 9&10
  uint64[3] a2; // slot 11
  SizeDefault immutable c = this; // slot 12
  SomeEnum immutable e1 = SomeEnum.One; // slot 12
  SomeEnum immutable e2 = SomeEnum.Two; // slot 12
  SomeEnum immutable e3 = SomeEnum.Three; // slot 12
  address payable immutable blockhole = payable(0); // slot 13

  constructor(uint _x) {
    x = _x;
  }
  // gap should be 36 = 50 - 14
}

/// @custom:storage-size 128
contract SizeOverride {
  /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
  uint immutable w1 = block.number;
  /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
  uint immutable w2 = block.timestamp;
  uint immutable x; // slot 0 (after conversion to private)
  uint constant y = 1;
  uint224 z0; // slot 1
  uint256 z1; // slot 2
  uint32 z2; // slot 3
  OneAndAHalfSlot s1; // slot 4&5
  OneAndAHalfSlot s2; // slot 6&7
  uint32 z3; // slot 8
  uint32 z4; // slot 8
  uint32 z5; // slot 8
  uint64[5] a1; // slot 9&10
  uint64[3] a2 ; // slot 11
  SizeOverride immutable c = this; // slot 12
  SomeEnum immutable e1 = SomeEnum.One; // slot 12
  SomeEnum immutable e2 = SomeEnum.Two; // slot 12
  SomeEnum immutable e3 = SomeEnum.Three; // slot 12
  address payable immutable blockhole = payable(0); // slot 13

  constructor(uint _x) {
    x = _x;
  }
  // gap should be 114 = 128 - 14
}
