/*
import { expect, use } from 'chai'
import { Contract, constants } from 'ethers'
import { MockProvider, createFixtureLoader, solidity } from 'ethereum-waffle'
import { getPopularizeDigest, getChangeAddressDigest } from './shared/utilities'
import { ecsign } from 'ethereumjs-util'
import { v1Fixture } from './shared/fixtures'

use(solidity)

const overrides = {
    gasLimit: 9999999
}

describe('buy QFT', () => {
    const provider = new MockProvider()
    const [wallet, wallet1, wallet2, wallet2_new, wallet3, wallet4, wallet5] = provider.getWallets();
    const loadFixture = createFixtureLoader([wallet])

    let popularized: Contract;
    let usdt: Contract
    let mining: Contract
    let buy: Contract
    let helper: Contract
    let chainId: number

    // w1 -> w2 and msg.sender == w1
    async function popularize1(w1: any, w2: any) {
        const digest = await getPopularizeDigest(chainId, popularized, { addr_p: w1.address, addr_c: w2.address, index: 0 })
        const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w2.privateKey.slice(2), 'hex'))
        await popularized.connect(w1).popularize1(w2.address, v, r, s, overrides)
    }

    async function initPopularize() {
        await popularize1(wallet, wallet1)
        await popularize1(wallet1, wallet2)
        await popularize1(wallet2, wallet3)
        await popularize1(wallet3, wallet4)
        await popularize1(wallet4, wallet5)
    }

    async function changeAddress1(w1: any, w2: any, w3: any) {
        const digest = await getChangeAddressDigest(chainId, popularized, { addr_old: w2.address, addr_new: w3.address })
        var { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(w2.privateKey.slice(2), 'hex'))
        await popularized.connect(w1).changeAddress1(w2.address, w3.address, v, r, s, overrides)
    }

    beforeEach(async () => {
        const fixture = await loadFixture(v1Fixture)
        popularized = fixture.popularized
        usdt = fixture.USDT
        mining = fixture.Mining
        buy = fixture.Buy
        helper = fixture.Helper
        chainId = fixture.chainId
    })

    it('popularize', async () => {
        await initPopularize()
        expect(await popularized.totalSupply()).to.eq(6)
        await wallet.sendTransaction({ from: wallet.address, to: buy.address, value: constants.WeiPerEther.mul(1000) })
        await mining.setNode(wallet.address, true, overrides)
    })

    it('voteIn', async () => {
        try {
            await mining.voteIn({ value: constants.WeiPerEther.mul(128), ...overrides })
            await mining.connect(wallet1).voteIn({ value: constants.WeiPerEther.mul(256), ...overrides })
            await mining.connect(wallet2).voteIn({ value: constants.WeiPerEther.mul(256), ...overrides })
            await mining.connect(wallet3).voteIn({ value: constants.WeiPerEther.mul(256), ...overrides })
            await mining.connect(wallet4).voteIn({ value: constants.WeiPerEther.mul(256), ...overrides })
            await mining.connect(wallet5).voteIn({ value: constants.WeiPerEther.mul(256), ...overrides })
        } catch (error: any) {
            console.log(error)
        }
    })

    it('buy', async () => {
        try {
            await usdt.transfer(wallet5.address, constants.WeiPerEther.mul(100), overrides)
            await usdt.transfer(wallet2_new.address, await usdt.balanceOf(wallet.address), overrides)
            await usdt.connect(wallet5).approve(buy.address, constants.MaxUint256, overrides)
            const w50 = await mining.spreads(wallet5.address)
            const ret2_new = await mining.spreads(wallet5.address)
            console.log(ret2_new.vote.toString())
            
            await buy.connect(wallet5).buy(constants.WeiPerEther.mul(100), 0, overrides)
            const ret3_new = await mining.spreads(wallet5.address)
            console.log(ret3_new.vote.toString())

            console.log(mining.address,popularized.address)
            
            const w51 = await mining.spreads(wallet5.address)
            expect(w51.vote.sub(w50.vote).toString()).to.eq(constants.WeiPerEther.mul(80))
    
            const ret5 = await usdt.balanceOf(wallet5.address)
            const ret4 = await usdt.balanceOf(wallet4.address)
            const ret3 = await usdt.balanceOf(wallet3.address)
            const ret2 = await usdt.balanceOf(wallet2.address)
            const ret1 = await usdt.balanceOf(wallet1.address)
            const ret = await usdt.balanceOf(wallet.address)
            expect(ret5.add(ret4).add(ret3).add(ret2).add(ret1).add(ret)).to.eq(constants.WeiPerEther.mul(20).sub(4))
    
            let income = await buy.info(wallet.address)
            expect(ret).to.eq(income.leader.add(income.general).add(income.indirect).add(income.direct))
    
            income = await buy.info(wallet1.address)
            expect(ret1).to.eq(income.leader.add(income.general).add(income.indirect).add(income.direct))
    
            income = await buy.info(wallet2.address)
            expect(ret2).to.eq(income.leader.add(income.general).add(income.indirect).add(income.direct))
    
            income = await buy.info(wallet3.address)
            expect(ret3).to.eq(income.leader.add(income.general).add(income.indirect).add(income.direct))
    
            income = await buy.info(wallet4.address)
            expect(ret4).to.eq(income.leader.add(income.general).add(income.indirect).add(income.direct))
    
            income = await buy.info(wallet5.address)
            expect(ret5).to.eq(income.leader.add(income.general).add(income.indirect).add(income.direct))
            
        } catch (error: any) {
            console.log(error)
        }
    })

    it('changeAddress', async () => {
        
        await mining.connect(wallet2).voteMining(overrides)
        const ret2 = await mining.spreads(wallet2.address)
        await changeAddress1(wallet1, wallet2, wallet2_new)
        await mining.connect(wallet2_new).changeAddress(wallet2.address, wallet2_new.address, overrides)
        await mining.connect(wallet2_new).voteMining(overrides)
        const ret2_new = await mining.spreads(wallet2_new.address)
        expect(ret2_new.real_power).to.eq(ret2.real_power)
        
    })

    it('helper', async () => {
        
        const ret = await helper.MiningInfo(wallet1.address)
        console.log('bn', ret.bn.toString())
        console.log('begin', ret.begin.toString())
        console.log('epoch', ret.epoch.toString())
        console.log('epoch_height', ret.epoch_height.toString())
        for (let i = 0; i < ret.infos.length; i++) {
            console.log('info.addr', ret.infos[i].addr.toString())
            console.log('info.vote', ret.infos[i].info.vote.toString())
            console.log('info.airdrop', ret.infos[i].info.airdrop.toString())
            console.log('info.vote_power', ret.infos[i].info.vote_power.toString())
        }
        
    })
})
*/