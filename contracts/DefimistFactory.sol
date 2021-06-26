pragma solidity =0.5.16;

import './interfaces/IDefimistFactory.sol';
import './DefimistPair.sol';

contract DefimistFactory is IDefimistFactory {
    address public feeTo;
    address public feeToSetter;
    uint8 public protocolFeeDenominator = 9; // uses ~10% of each swap fee
    bytes32 public constant INIT_CODE_PAIR_HASH = keccak256(abi.encodePacked(type(DefimistPair).creationCode));

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'DefimistFactory: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'DefimistFactory: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'DefimistFactory: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(DefimistPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IDefimistPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'DefimistFactory: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'DefimistFactory: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
    
    function setProtocolFee(uint8 _protocolFeeDenominator) external {
        require(msg.sender == feeToSetter, 'DefimistFactory: FORBIDDEN');
        require(_protocolFeeDenominator > 0, 'DefimistFactory: FORBIDDEN_FEE');
        protocolFeeDenominator = _protocolFeeDenominator;
    }
    
    function setSwapFee(address _pair, uint32 _swapFee) external {
        require(msg.sender == feeToSetter, 'DefimistFactory: FORBIDDEN');
        IDefimistPair(_pair).setSwapFee(_swapFee);
    }
}
