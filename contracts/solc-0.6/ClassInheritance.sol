pragma solidity ^0.6.0;

interface CIC {
    function fooBar(uint a) external;
}

contract CIA {
    uint256 public foo;
    event log(string);
    constructor(uint bar) public {
        foo = bar;
        emit log("SIA");
    }
}

contract CIB is CIA(324) {
    uint256 public val = 123;
}

contract CID is CIC {
    uint256 public val = 123;

    function fooBar(uint a) override external{

    }
}
