pragma solidity ^0.6.0;

import './Imported.sol';

contract ConstructorUpdates is Imported2 {
    constructor(uint x, uint yx, uint y) Imported2(x, y) public {
        uint z = 7;

        z = x + yx;
        //Test comment including y inside
        {
            uint y = 6 + x;
        }

        foo(x);
    }

    function foo(uint x) public {}
}
