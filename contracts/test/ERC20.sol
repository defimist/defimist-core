pragma solidity =0.5.16;

import '../DefimistERC20.sol';

contract ERC20 is DefimistERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
