pragma solidity ^0.6.0;

import { Imp1 } from './TransformImport2-Imported.sol';
import { Imp2 as ImpX } from './TransformImport2-Imported.sol';

contract Foo {
    using Imp1 for Imp1.S;
    using ImpX for ImpX.S;
}
