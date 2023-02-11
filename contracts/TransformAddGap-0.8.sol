// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

type ShortString is bytes32;

contract Foo {
    ShortString immutable s = ShortString.wrap(0);
}
