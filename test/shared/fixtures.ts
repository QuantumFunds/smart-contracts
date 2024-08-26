import { Wallet, Contract, constants } from 'ethers'
import { deployContract } from 'ethereum-waffle'

import Popularized from '../../build/Popularized.json'
import QFT from '../../build/QFT.json'
import Mining from '../../build/Mining.json'

const overrides = {
    gasLimit: 9999999
}

interface V1Fixture {
    popularized: Contract
    QFT: Contract
    Mining: Contract
    chainId: number
}

export async function v1Fixture([wallet]: Wallet[]): Promise<V1Fixture> {
    const popularized_ = await deployContract(wallet, Popularized, [wallet.address], overrides)
    const QFT_ = await deployContract(wallet, QFT, [], overrides)
    const Mining_ = await deployContract(wallet, Mining, [], overrides)

    const chainId_ = (await wallet.provider.getNetwork()).chainId
    return { popularized: popularized_, QFT: QFT_, Mining: Mining_, chainId: chainId_ }
}
