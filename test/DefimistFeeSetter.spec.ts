import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { AddressZero } from 'ethers/constants'
import { bigNumberify } from 'ethers/utils'
import { solidity, MockProvider, createFixtureLoader, deployContract } from 'ethereum-waffle'

import { getCreate2Address } from './shared/utilities'
import { pairFixture } from './shared/fixtures'

import DefimistPair from '../build/DefimistPair.json'
import DefimistFeeSetter from '../build/DefimistFeeSetter.json'

chai.use(solidity)

const TEST_ADDRESSES: [string, string] = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000'
]

describe('DefimistFeeSetter', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [dmdao, pairOwner, protocolFeeReceiver, other] = provider.getWallets()
  const loadFixture = createFixtureLoader(provider, [dmdao, other, protocolFeeReceiver])

  let factory: Contract
  let token0: Contract
  let token1: Contract
  let pair: Contract
  let feeSetter: Contract
  let feeReceiver: Contract
  beforeEach(async () => {
    const fixture = await loadFixture(pairFixture)
    factory = fixture.factory
    token0 = fixture.token0
    token1 = fixture.token1
    pair = fixture.pair
    feeSetter = fixture.feeSetter
    feeReceiver = fixture.feeReceiver
  })

  it('feeToSetter', async () => {
    expect(await factory.feeTo()).to.eq(feeReceiver.address)
    expect(await factory.feeToSetter()).to.eq(feeSetter.address)
    expect(await feeSetter.owner()).to.eq(dmdao.address)
  })

  it('setFeeTo', async () => {
    // Should not allow to setFeeTo from other address that is not owner calling feeSetter
    await expect(feeSetter.connect(other).setFeeTo(other.address)).to.be.revertedWith('DefimistFeeSetter: FORBIDDEN')
    await feeSetter.connect(dmdao).setFeeTo(dmdao.address)

    // If feeToSetter changes it will will fail in DefimistFactory check when trying to setFeeTo from FeeSetter.
    await feeSetter.connect(dmdao).setFeeToSetter(other.address)
    await expect(feeSetter.connect(dmdao).setFeeTo(dmdao.address)).to.be.revertedWith('DefimistFactory: FORBIDDEN')
  })
  
  it('setProtocolFee', async () => {
    // Should not allow to setProtocolFee from other address taht is not owner calling feeSetter
    await expect(feeSetter.connect(other).setProtocolFee(5)).to.be.revertedWith('DefimistFeeSetter: FORBIDDEN')
    await feeSetter.connect(dmdao).setProtocolFee(5)
    expect(await factory.protocolFeeDenominator()).to.eq(5)
    
    // If feeToSetter changes it will will fail in DefimistFactory check when trying to setProtocolFee from FeeSetter.
    await feeSetter.connect(dmdao).setFeeToSetter(other.address)
    await expect(feeSetter.connect(dmdao).setProtocolFee(5)).to.be.revertedWith('DefimistFactory: FORBIDDEN')
  })
  
  it('setSwapFee', async () => {
    // Should not allow to setSwapFee from other address taht is not owner calling feeSetter
    await expect(feeSetter.connect(other).setSwapFee(pair.address, 5)).to.be.revertedWith('DefimistFeeSetter: FORBIDDEN')
    await feeSetter.connect(dmdao).setSwapFee(pair.address, 5)
    expect(await pair.swapFee()).to.eq(5)
    
    // If ownership of the pair is given to other address both addresses (FeeSetter owner and Pair owner) should be
    // able to change the swap fee
    await expect(feeSetter.connect(pairOwner).setSwapFee(pair.address, 5)).to.be.revertedWith('DefimistFeeSetter: FORBIDDEN')
    await feeSetter.connect(dmdao).transferPairOwnership(pair.address, pairOwner.address)
    await feeSetter.connect(pairOwner).setSwapFee(pair.address, 3)
    expect(await pair.swapFee()).to.eq(3)
    await feeSetter.connect(dmdao).setSwapFee(pair.address, 7)
    expect(await pair.swapFee()).to.eq(7)
    
    // If ownership of the pair is removed by setting it to zero the pair owner should not be able to change the 
    // fee anymore.
    await feeSetter.connect(dmdao).transferPairOwnership(pair.address, AddressZero)
    await expect(feeSetter.connect(pairOwner).setSwapFee(pair.address, 5)).to.be.revertedWith('DefimistFeeSetter: FORBIDDEN')

    // If feeToSetter changes it will will fail in DefimistFactory check when trying to setSwapFee from FeeSetter.
    await feeSetter.connect(dmdao).setFeeToSetter(other.address)
    await expect(feeSetter.connect(dmdao).setSwapFee(pair.address, 5)).to.be.revertedWith('DefimistFactory: FORBIDDEN')
  })
  
  it('setFeeToSetter', async () => {
    // Should not allow to setFeeToSetter from other address taht is not owner calling feeSetter
    await expect(feeSetter.connect(other).setFeeToSetter(other.address)).to.be.revertedWith('DefimistFeeSetter: FORBIDDEN')
    await feeSetter.connect(dmdao).setFeeToSetter(other.address)
    expect(await factory.feeToSetter()).to.eq(other.address)
    // If feeToSetter changes it will will fail in DefimistFactory check when trying to setFeeToSetter from FeeSetter.
    await expect(feeSetter.connect(dmdao).setFeeToSetter(dmdao.address)).to.be.revertedWith('DefimistFactory: FORBIDDEN')
  })
})
