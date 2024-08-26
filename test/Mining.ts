import { expect, use } from 'chai';
import { Contract, constants, ethers, utils } from 'ethers';
import { MockProvider, createFixtureLoader, solidity, deployContract } from 'ethereum-waffle';
import { getPopularizeDigest, getChangeAddressDigest, Sleep, mineBlock } from './shared/utilities';
import { ecsign } from 'ethereumjs-util';
import { v1Fixture } from './shared/fixtures';

use(solidity);

const overrides = {
  gasLimit: 9999999
}

describe('Mining', () => {
  const provider = new MockProvider()

  const [wallet, wallet1, wallet2, wallet2_new, wallet3, wallet4] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet])

  let popularized: Contract
  let qft: Contract
  let mining: Contract
  let chainId: number

  // w1 -> w2 and msg.sender == w1
  async function popularize1(w1: any, w2: any) {
    const digest = await getPopularizeDigest(chainId, popularized, { addr_p: w1.address, addr_c: w2.address, index: 0 })
    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w2.privateKey.slice(2), 'hex'))
    await popularized.connect(w1).popularize1(w2.address, v, r, s, overrides)
  }

  // w1 -> w2 and msg.sender == w2
  async function popularize2(w1: any, w2: any) {
    const digest = await getPopularizeDigest(chainId, popularized, { addr_p: w1.address, addr_c: w2.address, index: 0 })
    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w1.privateKey.slice(2), 'hex'))
    await popularized.connect(w2).popularize2(w1.address, v, r, s, overrides)
  }

  // w1 -> w2 and msg.sender == w1
  async function popularize3(w1: any, w2: any) {
    const temp = provider.createEmptyWallet()
    const digest = await getPopularizeDigest(chainId, popularized, { addr_p: w2.address, addr_c: temp.address, index: 0 })
    const p_vrs = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w2.privateKey.slice(2), 'hex'))

    // ============================
    const temp_digest = utils.keccak256(
      utils.solidityPack(
        ['address'],
        [w1.address]
      )
    )
    const temp_vrs = ecsign(Buffer.from(temp_digest.slice(2), 'hex'), Buffer.from(temp.privateKey.slice(2), 'hex'))
    await popularized.connect(w1).popularize3(w2.address, temp.address,
      p_vrs.v, p_vrs.r, p_vrs.s,
      temp_vrs.v, temp_vrs.r, temp_vrs.s, overrides)
  }


  // w1 -> w2 and msg.sender == w2
  async function popularize4(w1: any, w2: any, index: number) {
    const temp = provider.createEmptyWallet()
    const digest = await getPopularizeDigest(chainId, popularized, { addr_p: w1.address, addr_c: temp.address, index: index })
    const p_vrs = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w1.privateKey.slice(2), 'hex'))

    // ============================
    const temp_digest = utils.keccak256(
      utils.solidityPack(
        ['address'],
        [w2.address]
      )
    )
    const temp_vrs = ecsign(Buffer.from(temp_digest.slice(2), 'hex'), Buffer.from(temp.privateKey.slice(2), 'hex'))
    await popularized.connect(w2).popularize4(w1.address, temp.address,
      p_vrs.v, p_vrs.r, p_vrs.s,
      temp_vrs.v, temp_vrs.r, temp_vrs.s, overrides)
  }


  // w1 (up)  w2 (down old) w3 (down new)
  async function changeAddress1(w1: any, w2: any, w3: any) {
    const digest = await getChangeAddressDigest(chainId, popularized, { addr_old: w2.address, addr_new: w3.address })
    var { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w2.privateKey.slice(2), 'hex'))
    await popularized.connect(w1).changeAddress1(w2.address, w3.address, v, r, s, overrides)
  }


  // w1 (up)  w2 (down old) w3 (down new)
  async function changeAddress2(w1: any, w2: any, w3: any) {
    const digest = await getChangeAddressDigest(chainId, popularized, { addr_old: w2.address, addr_new: w3.address })
    var { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w1.privateKey.slice(2), 'hex'))
    await popularized.connect(w2).changeAddress2(w2.address, w3.address, v, r, s, overrides)
  }



  async function initPopularize() {
    await popularize1(wallet, wallet1)
    await popularize2(wallet1, wallet2)
    await popularize3(wallet2, wallet3)
  }

  beforeEach(async () => {
    const fixture = await loadFixture(v1Fixture)
    popularized = fixture.popularized
    qft = fixture.QFT;
    mining = fixture.Mining
    chainId = fixture.chainId
  })

  it('popularized', async () => {
    await initPopularize()
    expect(await popularized.totalSupply()).to.eq(4)
    expect(await popularized.balanceOf(wallet.address)).to.eq(1)
    expect(await popularized.balanceOf(wallet1.address)).to.eq(1)
    expect(await popularized.balanceOf(wallet2.address)).to.eq(1)
    expect(await popularized.balanceOf(wallet3.address)).to.eq(0)
  })

  
  /*
  it('airdropsIn', async () => {
    try {
      await qft.transfer(mining.address, constants.WeiPerEther.mul(100000000));

      await qft.approve(mining.address, constants.MaxUint256);
      await expect(mining.airdropsIn(wallet1.address, 0)).to.be.reverted
      await mining.airdropsIn(wallet.address, constants.WeiPerEther.mul(128))
      await mining.airdropsIn(wallet1.address, constants.WeiPerEther.mul(128))
      await mining.airdropsIn(wallet2.address, constants.WeiPerEther.mul(128))
      await mining.airdropsIn(wallet3.address, constants.WeiPerEther.mul(128))
      await mining.airdropsIn(wallet4.address, constants.WeiPerEther.mul(128))
    } catch (error: any) {
      console.log(error)
    }
  })

  it('voteIn', async () => {
    try {
      await mining.voteIn(constants.WeiPerEther.mul(128));
      await qft.connect(wallet1).approve(mining.address, constants.MaxUint256);
      await qft.connect(wallet2).approve(mining.address, constants.MaxUint256);
      await qft.connect(wallet3).approve(mining.address, constants.MaxUint256);

      await qft.transfer(wallet1.address, constants.WeiPerEther.mul(128));
      await qft.transfer(wallet2.address, constants.WeiPerEther.mul(128));
      await qft.transfer(wallet3.address, constants.WeiPerEther.mul(128));

      await mining.connect(wallet1).voteIn(constants.WeiPerEther.mul(128));
      await mining.connect(wallet2).voteIn(constants.WeiPerEther.mul(128));
      await mining.connect(wallet3).voteIn(constants.WeiPerEther.mul(128));

    } catch (error: any) {
      console.log(error);
    }
  })

  it('voteMining', async () => {
    await mining.voteMining()

    await mining.connect(wallet1).voteMining()
    await mining.connect(wallet2).voteMining()
    await mining.connect(wallet3).voteMining()

    await mining.voteMining()
    await mining.connect(wallet1).voteMining()
    await mining.connect(wallet2).voteMining()
    await mining.connect(wallet3).voteMining()


    let ret = await mining.spreads(wallet.address)

    expect(ret.real_power.div(ret.vote_power)).to.eq(7)
    ret = await mining.spreads(wallet1.address)
    expect(ret.real_power.div(ret.vote_power)).to.eq(8)

    ret = await mining.spreads(wallet2.address)
    expect(ret.real_power.div(ret.vote_power)).to.eq(8)

    ret = await mining.spreads(wallet3.address)
    expect(ret.real_power.div(ret.vote_power)).to.eq(7)

    await mining.connect(wallet1).voteMining()
    await mining.connect(wallet2).voteMining()

    const ret4 = await mining.spreads(wallet4.address)
    expect(ret4.real_power).to.eq(0)
    await popularize4(wallet3, wallet4, 1)
    await mining.connect(wallet4).voteMining()
    const ret41 = await mining.spreads(wallet4.address)
    expect(ret41.real_power).to.gt(0)

  })

  it('voteOut', async () => {
    try {
      const ret1 = await mining.spreads(wallet.address);
      //console.log(ret1);
      await mining.voteOut1(constants.WeiPerEther.mul(100));
      const ret2 = await mining.spreads(wallet.address);
      //console.log(ret2);
    } catch (error: any) {
      console.log(error)
    }
  })

  it('changeAddress1', async () => {
    
    expect(await popularized.totalSupply()).to.eq(5);

    await changeAddress1(wallet1, wallet2, wallet2_new);

    let ret = await popularized.parents(wallet3.address, 10)
    expect(ret.addrs[0]).to.eq(wallet2_new.address)
    ret = await popularized.parents(wallet2.address, 10)
    expect(ret.len).to.eq(0)

    ret = (await popularized.spreads(wallet1.address)).child
    expect(ret[0]).to.eq(wallet2_new.address)
    ret = (await popularized.spreads(wallet2_new.address)).child
    expect(ret[0]).to.eq(wallet3.address)

    ret = (await popularized.spreads(wallet2.address)).child
    expect(ret.length).to.eq(0)

    ret = await popularized.addressChange(wallet2_new.address)
    expect(ret).to.eq(wallet2.address)
    
  });

  it('changeAddress2', async () => {
    try {
      expect(await popularized.totalSupply()).to.eq(5)

      await changeAddress2(wallet1, wallet2, wallet2_new)
      await mining.connect(wallet2_new).changeAddress(wallet2.address, wallet2_new.address);

      let ret = await popularized.parents(wallet3.address, 10)
      expect(ret.addrs[0]).to.eq(wallet2_new.address)
      ret = await popularized.parents(wallet2.address, 10)
      expect(ret.len).to.eq(0)

      ret = (await popularized.spreads(wallet1.address)).child
      expect(ret[0]).to.eq(wallet2_new.address)
      ret = (await popularized.spreads(wallet2_new.address)).child
      expect(ret[0]).to.eq(wallet3.address)

      ret = (await popularized.spreads(wallet2.address)).child
      expect(ret.length).to.eq(0)

      ret = await popularized.addressChange(wallet2_new.address)
      expect(ret).to.eq(wallet2.address)

    } catch (error: any) {
      console.log(error)
    }
  });

  it('add_profit', async () => {
    //console.log(await mining.profits(1));
    await mining.add_profit(ethers.constants.WeiPerEther);
    //console.log(await mining.profits(1));
    //console.log(await mining.power_profit_whole(1));
  })
    */
})
