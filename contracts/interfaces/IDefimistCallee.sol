pragma solidity >=0.5.0;

interface IDefimistCallee {
    function DefimistCall(address sender, uint amount0, uint amount1, bytes calldata data) external;
}
