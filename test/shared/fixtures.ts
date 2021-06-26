import { Contract, Wallet } from 'ethers'
import { Web3Provider } from 'ethers/providers'
import { defaultAbiCoder } from 'ethers/utils'
import { deployContract } from 'ethereum-waffle'

import { expandTo18Decimals } from './utilities'

import ERC20 from '../../build/ERC20.json'
import WETH9 from '../../build/WETH9.json'
import DefimistFactory from '../../build/DefimistFactory.json'
import DefimistPair from '../../build/DefimistPair.json'
import DefimistDeployer from '../../build/DefimistDeployer.json'
import DefimistFeeSetter from '../../build/DefimistFeeSetter.json'
import DefimistFeeReceiver from '../../build/DefimistFeeReceiver.json'

interface FactoryFixture {
  factory: Contract
  feeSetter: Contract
  feeReceiver: Contract
  WETH: Contract
}

const overrides = {
  gasLimit: 9999999
}

export async function factoryFixture(provider: Web3Provider, [dmdao, ethReceiver]: Wallet[]): Promise<FactoryFixture> {
  const WETH = await deployContract(dmdao, WETH9)
  const defimistDeployer = await deployContract(
    dmdao, DefimistDeployer, [ ethReceiver.address, dmdao.address, WETH.address, [], [], [], ], overrides
  )
  await dmdao.sendTransaction({to: defimistDeployer.address, gasPrice: 0, value: 1})
  const deployTx = await defimistDeployer.deploy()
  const deployTxReceipt = await provider.getTransactionReceipt(deployTx.hash);
  const factoryAddress = deployTxReceipt.logs !== undefined
    ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[0].data)[0]
    : null
  const factory = new Contract(factoryAddress, JSON.stringify(DefimistFactory.abi), provider).connect(dmdao)
  const feeSetterAddress = await factory.feeToSetter()
  const feeSetter = new Contract(feeSetterAddress, JSON.stringify(DefimistFeeSetter.abi), provider).connect(dmdao)
  const feeReceiverAddress = await factory.feeTo()
  const feeReceiver = new Contract(feeReceiverAddress, JSON.stringify(DefimistFeeReceiver.abi), provider).connect(dmdao)
  return { factory, feeSetter, feeReceiver, WETH }
}

interface PairFixture extends FactoryFixture {
  token0: Contract
  token1: Contract
  pair: Contract
  wethPair: Contract
}

export async function pairFixture(provider: Web3Provider, [dmdao, wallet, ethReceiver]: Wallet[]): Promise<PairFixture> {
  const tokenA = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
  const tokenB = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
  const WETH = await deployContract(wallet, WETH9)
  await WETH.deposit({value: expandTo18Decimals(1000)})
  const token0 = tokenA.address < tokenB.address ? tokenA : tokenB
  const token1 = token0.address === tokenA.address ? tokenB : tokenA
  
  const defimistDeployer = await deployContract(
    dmdao, DefimistDeployer, [
      ethReceiver.address,
      dmdao.address,
      WETH.address,
      [token0.address, token1.address],
      [token1.address, WETH.address],
      [15, 15],
    ], overrides
  )
  await dmdao.sendTransaction({to: defimistDeployer.address, gasPrice: 0, value: 1})
  const deployTx = await defimistDeployer.deploy()
  const deployTxReceipt = await provider.getTransactionReceipt(deployTx.hash);
  const factoryAddress = deployTxReceipt.logs !== undefined
    ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[0].data)[0]
    : null
  
  const factory = new Contract(factoryAddress, JSON.stringify(DefimistFactory.abi), provider).connect(dmdao)
  const feeSetterAddress = await factory.feeToSetter()
  const feeSetter = new Contract(feeSetterAddress, JSON.stringify(DefimistFeeSetter.abi), provider).connect(dmdao)
  const feeReceiverAddress = await factory.feeTo()
  const feeReceiver = new Contract(feeReceiverAddress, JSON.stringify(DefimistFeeReceiver.abi), provider).connect(dmdao)
  const pair = new Contract(
     await factory.getPair(token0.address, token1.address),
     JSON.stringify(DefimistPair.abi), provider
   ).connect(dmdao)
  const wethPair = new Contract(
     await factory.getPair(token1.address, WETH.address),
     JSON.stringify(DefimistPair.abi), provider
   ).connect(dmdao)

  return { factory, feeSetter, feeReceiver, WETH, token0, token1, pair, wethPair }
}
