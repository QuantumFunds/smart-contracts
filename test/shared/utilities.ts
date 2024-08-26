import { Contract, utils, providers } from 'ethers'
import { MockProvider } from 'ethereum-waffle'

async function getDomainSeparator(chainId: number, name: string, tokenAddress: string) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        utils.keccak256(utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        utils.keccak256(utils.toUtf8Bytes(name)),
        utils.keccak256(utils.toUtf8Bytes('1')),
        chainId,
        tokenAddress
      ]
    )
  )
}

export async function getPopularizeDigest(
  chainId: number,
  token: Contract,
  popularize: {
    addr_p: string,
    addr_c: string,
    index: number
  }
): Promise<string> {
  const name = await token.name()
  const DOMAIN_SEPARATOR = await getDomainSeparator(chainId, name, token.address)
  //console.log('old:',utils.keccak256(utils.toUtf8Bytes('nonce(uint256 n)')))
  //console.log('new:',utils.keccak256(utils.toUtf8Bytes('popularize(address addr_p,address addr_c,uint256 index)')))
  return utils.keccak256(
    utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        utils.keccak256(
          utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256'],
            [utils.keccak256(utils.toUtf8Bytes('popularize(address addr_p,address addr_c,uint256 index)')), popularize.addr_p, popularize.addr_c, popularize.index]
          )
        )
      ]
    )
  )
}

export async function getChangeAddressDigest(
  chainId: number,
  token: Contract,
  popularize: {
    addr_old: string,
    addr_new: string
  }
): Promise<string> {
  const name = await token.name()
  const DOMAIN_SEPARATOR = await getDomainSeparator(chainId, name, token.address)
  return utils.keccak256(
    utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        utils.keccak256(
          utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address'],
            [utils.keccak256(utils.toUtf8Bytes('changeAddress(address addr_old,address addr_new)')), popularize.addr_old, popularize.addr_new]
          )
        )
      ]
    )
  )
}

// await mineBlock(provider, 3600)
export async function mineBlock(provider: MockProvider, timestamp: number): Promise<void> {
  await new Promise(async (resolve, reject) => {
    ; (provider.provider.sendAsync as any)(
      // evm_increaseTime
      { jsonrpc: '2.0', method: 'evm_increaseTime', params: [timestamp] },
      (error: any, result: any): void => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )
  })
  
  await new Promise(async (resolve, reject) => {
    const utc = (await provider.getBlock(await provider.getBlockNumber())).timestamp + timestamp
    ; (provider.provider.sendAsync as any)(
      // evm_increaseTime
      { jsonrpc: '2.0', method: 'evm_mine', params: [utc] },
      (error: any, result: any): void => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )
  })  
}

export const Sleep = (ms: any) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

