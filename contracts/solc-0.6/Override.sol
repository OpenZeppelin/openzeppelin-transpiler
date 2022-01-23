// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

contract Parent1 {
    function foo() public virtual {
    }

    function bar() public virtual {
    }
}

contract Parent2 {
    function foo() public virtual {
    }
}

contract Child is Parent1, Parent2 {
    function foo() public override(Parent1, Parent2) {
    }

    function bar() public override {
    }
}
