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

contract Foo7 {
    uint a;
    constructor(
        uint _a
    ) public {
        a = _a;
    }
}

contract Foo8 {

    modifier hasModifier(){
        _;
    }

    constructor() public hasModifier {
    }
}

contract Foo9 {
    constructor(
        uint a,
        uint b
    ) public {
        b = 0;
    }
}

contract Foo10 is Foo7(123) {

    uint bar = 1;
}

contract Foo11 is Foo7 {

    modifier hasModifier() {
        _;
    }

    constructor(uint a) Foo7(a) public hasModifier {
    }
}

contract Foo12 is Foo7{

    constructor(uint a) Foo7(a) public {
    }
}

contract Foo13 is Foo4 {
    constructor(uint a) public {

    }
}