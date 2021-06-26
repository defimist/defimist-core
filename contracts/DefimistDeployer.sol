pragma solidity =0.5.16;

import './DefimistFactory.sol';
import './interfaces/IDefimistPair.sol';
import './DefimistFeeSetter.sol';
import './DefimistFeeReceiver.sol';


contract DefimistDeployer {
    
    address payable public protocolFeeReceiver;
    address payable public dmdaoAvatar;
    address public WETH;
    uint8 public state = 0;

    struct TokenPair {
        address tokenA;
        address tokenB;
        uint32 swapFee;
    }
    
    TokenPair[] public initialTokenPairs;

    event FeeReceiverDeployed(address feeReceiver);    
    event FeeSetterDeployed(address feeSetter);
    event PairFactoryDeployed(address factory);
    event PairDeployed(address pair);
        
    // Step 1: Create the deployer contract with all the needed information for deployment.
    constructor(
        address payable _protocolFeeReceiver,
        address payable _dmdaoAvatar,
        address _WETH,
        address[] memory tokensA,
        address[] memory tokensB,
        uint32[] memory swapFees
    ) public {
        dmdaoAvatar = _dmdaoAvatar;
        WETH = _WETH;
        protocolFeeReceiver = _protocolFeeReceiver;
        for(uint8 i = 0; i < tokensA.length; i ++) {
            initialTokenPairs.push(
                TokenPair(
                    tokensA[i],
                    tokensB[i],
                    swapFees[i]
                )
            );
        }
    }
    
    // Step 2: Transfer ETH from the Defimist avatar to allow the deploy function to be called.
    function() external payable {
        require(state == 0, 'DefimistDeployer: WRONG_DEPLOYER_STATE');
        require(msg.sender == dmdaoAvatar, 'DefimistDeployer: CALLER_NOT_FEE_TO_SETTER');
        state = 1;
    }
    
    // Step 3: Deploy DefimistFactory and all initial pairs
    function deploy() public {
        require(state == 1, 'DefimistDeployer: WRONG_DEPLOYER_STATE');
        DefimistFactory defimistFactory = new DefimistFactory(address(this));
        emit PairFactoryDeployed(address(defimistFactory));
        for(uint8 i = 0; i < initialTokenPairs.length; i ++) {
            address newPair = defimistFactory.createPair(initialTokenPairs[i].tokenA, initialTokenPairs[i].tokenB);
            defimistFactory.setSwapFee(newPair, initialTokenPairs[i].swapFee);
            emit PairDeployed(
                address(newPair)
            );
        }
        DefimistFeeReceiver defimistFeeReceiver = new DefimistFeeReceiver(
            dmdaoAvatar, address(defimistFactory), WETH, protocolFeeReceiver, dmdaoAvatar
        );
        emit FeeReceiverDeployed(address(defimistFeeReceiver));
        defimistFactory.setFeeTo(address(defimistFeeReceiver));
        
        DefimistFeeSetter defimistFeeSetter = new DefimistFeeSetter(dmdaoAvatar, address(defimistFactory));
        emit FeeSetterDeployed(address(defimistFeeSetter));
        defimistFactory.setFeeToSetter(address(defimistFeeSetter));
        state = 2;
        msg.sender.transfer(address(this).balance);
    }
    
  
}
