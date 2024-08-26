import { expect, use } from 'chai'
import { Contract, constants, utils } from 'ethers'

import { deployContract, MockProvider, solidity, createFixtureLoader } from 'ethereum-waffle'
import { getPopularizeDigest, getChangeAddressDigest } from './shared/utilities'
import { ecsign, toRpcSig, fromRpcSig } from 'ethereumjs-util'
import { v1Fixture } from './shared/fixtures'

import Popularized from '../build/Popularized.json'

use(solidity)

const overrides = {
  gasLimit: 9999999
}

describe('Popularized test', () => {
  const provider = new MockProvider()

  const [wallet, wallet1, wallet2, wallet2_new, wallet3, wallet4, wallet5, wallet6, wallet7, wallet8] = provider.getWallets();
  const loadFixture = createFixtureLoader([wallet])

  let popularized: Contract;
  let chainId: number


  // w1 -> w2 and msg.sender == w1
  async function popularize1(w1: any, w2: any) {
    const digest = await getPopularizeDigest(chainId, popularized, { addr_p: w1.address, addr_c: w2.address, index: 0 })
    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w2.privateKey.slice(2), 'hex'))
    const sign = toRpcSig(v, r, s)
    //const ret = fromRpcSig(sign)
    const v_ = '0x' + sign.substring(130)
    const r_ = sign.substring(0, 66)
    const s_ = '0x' + sign.substring(66, 130)
    await popularized.connect(w1).popularize1(w2.address, v_, r_, s_, overrides)
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
  async function changeAddress2(w1: any, w2: any, w3: any) {
    const digest = await getChangeAddressDigest(chainId, popularized, { addr_old: w2.address, addr_new: w3.address })
    var { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w1.privateKey.slice(2), 'hex'))
    await popularized.connect(w2).changeAddress2(w2.address, w3.address, v, r, s, overrides)
  }

  // w1 (up)  w2 (down old) w3 (down new)
  async function changeAddress1(w1: any, w2: any, w3: any) {
    const digest = await getChangeAddressDigest(chainId, popularized, { addr_old: w2.address, addr_new: w3.address })
    var { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w2.privateKey.slice(2), 'hex'))
    await popularized.connect(w1).changeAddress1(w2.address, w3.address, v, r, s, overrides)
  }

  beforeEach(async () => {
    const fixture = await loadFixture(v1Fixture)
    chainId = fixture.chainId
    popularized = await deployContract(wallet, Popularized)
  })

  it('popularize1', async () => {
    expect(await popularized.balanceOf(popularized.address)).to.eq(1)
    expect(await popularized.totalSupply()).to.eq(1)
    expect(await popularized.balanceOf(wallet.address)).to.eq(0)
    await popularize4(wallet, wallet1, 1)
    expect(await popularized.balanceOf(wallet.address)).to.eq(1)
    expect(await popularized.totalSupply()).to.eq(2)
    let ret = (await popularized.spreads(wallet.address)).child;
    expect(ret.length).to.eq(1)
    expect(ret[0]).to.eq(wallet1.address)

    ret = await popularized.parents(wallet1.address, 10)
    expect(ret.len).to.eq(1)
    expect(ret.addrs[0]).to.eq(wallet.address)

    ret = (await popularized.spreads(wallet1.address)).child
    expect(ret.length).to.eq(0)

    ret = await popularized.parents(wallet.address, 10)
    expect(ret.len).to.eq(0)

    await popularize1(wallet, wallet2)

    await popularize1(wallet2, wallet3)
    ret = (await popularized.spreads(wallet.address)).child
    expect(ret.length).to.eq(2)

    ret = (await popularized.spreads(wallet2.address)).child
    expect(ret.length).to.eq(1)
  });

  it('popularize2', async () => {

    expect(await popularized.totalSupply()).to.eq(1)
    await popularize2(wallet, wallet1)
    expect(await popularized.totalSupply()).to.eq(2)

    let ret = (await popularized.spreads(wallet.address)).child
    expect(ret.length).to.eq(1)
    expect(ret[0]).to.eq(wallet1.address)
    ret = await popularized.parents(wallet1.address, 10)
    expect(ret.len).to.eq(1)
    expect(ret.addrs[0]).to.eq(wallet.address)

    ret = (await popularized.spreads(wallet1.address)).child
    expect(ret.length).to.eq(0)

    ret = await popularized.parents(wallet.address, 10)
    expect(ret.len).to.eq(0)

    await popularize2(wallet, wallet2)
    await popularize2(wallet2, wallet3)
    ret = (await popularized.spreads(wallet.address)).child
    expect(ret.length).to.eq(2)

    ret = (await popularized.spreads(wallet2.address)).child
    expect(ret.length).to.eq(1)

  });

  it('popularize3', async () => {

    expect(await popularized.totalSupply()).to.eq(1)
    await popularize3(wallet, wallet1)
    expect(await popularized.totalSupply()).to.eq(2)

    let ret = (await popularized.spreads(wallet.address)).child
    expect(ret.length).to.eq(1)
    expect(ret[0]).to.eq(wallet1.address)
    ret = await popularized.parents(wallet1.address, 10)
    expect(ret.len).to.eq(1)
    expect(ret.addrs[0]).to.eq(wallet.address)

    ret = (await popularized.spreads(wallet1.address)).child
    expect(ret.length).to.eq(0)

    ret = await popularized.parents(wallet.address, 10)
    expect(ret.len).to.eq(0)

    await popularize3(wallet, wallet2)
    await popularize3(wallet2, wallet3)
    ret = (await popularized.spreads(wallet.address)).child
    expect(ret.length).to.eq(2)

    ret = (await popularized.spreads(wallet2.address)).child
    expect(ret.length).to.eq(1)

  });

  it('changeAddress1', async () => {

    await popularize1(wallet, wallet1)
    await popularize2(wallet1, wallet2)
    await popularize3(wallet2, wallet3)
    await popularize1(wallet3, wallet4)
    expect(await popularized.totalSupply()).to.eq(5)

    await changeAddress1(wallet1, wallet2, wallet2_new)

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

    await popularize1(wallet, wallet1)
    await popularize2(wallet1, wallet2)
    await popularize3(wallet2, wallet3)
    await popularize1(wallet3, wallet4)
    expect(await popularized.totalSupply()).to.eq(5)

    await changeAddress2(wallet1, wallet2, wallet2_new)

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

  it('view', async () => {

    await popularize1(wallet, wallet1)
    await popularize2(wallet1, wallet2)
    await popularize3(wallet2, wallet3)
    await popularize1(wallet3, wallet4)

    await popularize1(wallet4, wallet5)
    await popularize2(wallet5, wallet6)
    await popularize3(wallet6, wallet7)
    await popularize3(wallet7, wallet8)
    const wallet9 = provider.createEmptyWallet()
    const wallet10 = provider.createEmptyWallet()
    await wallet1.sendTransaction({
      "to": wallet9.address,
      "value": constants.WeiPerEther.mul(10),
    })
    await wallet1.sendTransaction({
      "to": wallet10.address,
      "value": constants.WeiPerEther.mul(10),
    })
    await popularize2(wallet8, wallet9)
    await popularize1(wallet9, wallet2_new)
    await popularize3(wallet2_new, wallet10)

    expect(await popularized.totalSupply()).to.eq(12)
    let ret = await popularized.parents(wallet10.address, 10)
    expect(ret.len).to.eq(10)

    expect(ret.addrs[0]).to.eq(wallet2_new.address)
    expect(ret.addrs[1]).to.eq(wallet9.address)
    expect(ret.addrs[2]).to.eq(wallet8.address)
    expect(ret.addrs[3]).to.eq(wallet7.address)
    expect(ret.addrs[4]).to.eq(wallet6.address)
    expect(ret.addrs[5]).to.eq(wallet5.address)
    expect(ret.addrs[6]).to.eq(wallet4.address)
    expect(ret.addrs[7]).to.eq(wallet3.address)
    expect(ret.addrs[8]).to.eq(wallet2.address)
    expect(ret.addrs[9]).to.eq(wallet1.address)

    ret = await popularized.parents(ret.addrs[9], 10)
    expect(ret.len).to.eq(1)
    expect(ret.addrs[0]).to.eq(wallet.address)
  });

  it("require 'addr_old error'", async () => {

    const w = provider.createEmptyWallet()
    await wallet.sendTransaction({
      "to": w.address,
      "value": constants.WeiPerEther.mul(10),
    })

    const addr = utils.getContractAddress({
      from: w.address,
      nonce: await provider.getTransactionCount(w.address)
    })
    const test_contract = await deployContract(w, Popularized)
    expect(test_contract.address).to.eq(addr)

    const tx = await w.sendTransaction({
      "to": wallet.address,
      "value": constants.One,
    })
    expect(tx.nonce).to.eq(1)
    expect(await provider.getTransactionCount(w.address)).to.eq(2)

    const receipt = await tx.wait()
    expect(receipt.transactionIndex).to.eq(0)
    expect(receipt.from).to.eq(tx.from)


    const digest = await getChangeAddressDigest(chainId, popularized, { addr_old: w.address, addr_new: w.address })
    var { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w.privateKey.slice(2), 'hex'))

    await expect(test_contract.changeAddress1(wallet.address, wallet1.address, v, r, s)).to.revertedWith('addr_old error')

  })

});
