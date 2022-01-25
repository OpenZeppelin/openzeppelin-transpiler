// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './Imported.sol';

bytes32 constant constant1 = keccak256('openzepplin.contracts.AdvancedTypes.constant1');

contract AdvancedTypes  {

    bytes32 constant constant2 = keccak256('openzepplin.contracts.AdvancedTypes.constant12');

    enum AdvancedEnum {
        AdvancedEnum1,
        AdvancedEnum2,
        AdvancedEnum3,
        AdvancedEnum4
    }

    struct AdvancedStruct1 {
        address owner;
    }

    struct AdvancedStruct2 {
        mapping (address => AdvancedEnum) addrToEnum;
        mapping (uint256 => mapping(address => AdvancedStruct1)) indexAddressOwner;
        mapping (address => Imported2.imported2Struct) addressToImported2Struct;
    }

    AdvancedStruct2 testAdvancedStruct2;
    mapping (address => AdvancedEnum) addrToEnum2;
    mapping (uint256 => mapping(address => AdvancedStruct1)) indexAddressOwner2;
    mapping (address => function(address payable)) wowMapAddressToFunction;
    mapping (address => function(uint256, address, address, AdvancedEnum)) wowMapAddressToFunction2;
    address[] owners;
    mapping (address => bytes32) addrToConstant;
    mapping (address => Imported2.imported2Struct) addressToImported2Struct2;
    mapping (AdvancedEnum => mapping( AdvancedEnum => mapping(address => Imported2.imported2Struct))) public weirdestMapping;

    function setAdvancedStruct1(address payable addr) internal {
        testAdvancedStruct2.addressToImported2Struct[addr].payAddress = addr;
        addressToImported2Struct2[addr] = testAdvancedStruct2.addressToImported2Struct[addr];
    }

    function setAdvancedStruct2(uint256 index, address addr, address owner, AdvancedEnum advancedType) public {

        testAdvancedStruct2.addrToEnum[owner] = advancedType;
        testAdvancedStruct2.indexAddressOwner[index][addr].owner = owner;

        wowMapAddressToFunction[addr] = setAdvancedStruct1;
        wowMapAddressToFunction2[addr] = setAdvancedStruct2;
        weirdestMapping[AdvancedEnum.AdvancedEnum3][AdvancedEnum.AdvancedEnum4][addr].money = 1000000;

        owners.push(owner);

        addrToConstant[addr] = addrToConstant[owner];

    }

}
