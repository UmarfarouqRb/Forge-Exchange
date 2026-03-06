
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ForgeLiquidityVault {
    IERC20 public immutable token;
    mapping(address => uint256) public shares;
    uint256 public totalShares;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        token.transferFrom(msg.sender, address(this), amount);

        uint256 newShares = amount;
        shares[msg.sender] += newShares;
        totalShares += newShares;

        emit Deposited(msg.sender, amount, newShares);
    }

    event Deposited(address indexed user, uint256 amount, uint256 shares);
}
