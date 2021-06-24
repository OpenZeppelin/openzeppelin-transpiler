pragma solidity ^0.6;

contract Foo1 {
    constructor() public {
    }
}

contract Foo2 {
    event Ev();
    constructor() public {
        emit Ev();
    }
}

contract Foo3 {
    uint x = 1;
}

contract Foo4 {
    uint x = 1;
    event Ev();
    constructor() public {
        emit Ev();
    }
}

contract Bar1 {

}

contract Bar2 is Bar1 {

}

contract Bar3 is Bar2 {

}

contract Foo5 {
    constructor(function () external f) public {}
}

contract Foo6 {
    constructor(
        uint a,
        uint b
    ) public {}
}
