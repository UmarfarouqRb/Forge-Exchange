
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRouter {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}

contract LiquidityStrategy {
    address public owner;
    IRouter public router;
    IERC20 public tokenA;
    IERC20 public tokenB;

    constructor(address _router, address _tokenA, address _tokenB) {
        owner = msg.sender;
        router = IRouter(_router);
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity(uint256 amountA, uint256 amountB) external {
        require(msg.sender == owner, "Not owner");
        tokenA.approve(address(router), amountA);
        tokenB.approve(address(router), amountB);

        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            address(this),
            block.timestamp
        );
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
}
