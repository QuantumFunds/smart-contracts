import { use, expect } from 'chai';
import { solidity, deployContract } from 'ethereum-waffle';
import { ethers, utils, BigNumber, constants, errors } from 'ethers';

import Mining from '../build/Mining.json';
import Popularized from '../build/Popularized.json';
import QFT from '../build/QFT.json';
import Activity from '../build/Activity.json';
import Helper from '../build/Helper.json';

import fs from 'fs';

use(solidity)

const overrides = {
  gasLimit: 7999999,
  gasPrice: 10000000000
}

use(solidity);

describe('build', () => {

  const privateKey = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
  
  const provider: ethers.providers.Provider = new ethers.providers.JsonRpcProvider(
    'https://opbnb-mainnet-rpc.bnbchain.org'
  );


  let wallet: ethers.Wallet;
  let popularized: ethers.Contract;
  let mining: ethers.Contract;
  let helper: ethers.Contract;
  let qft: ethers.Contract;
  let usdt: ethers.Contract;
  let activity: ethers.Contract;
  let ms: ethers.Contract;

  const config = {
    qft_addr: '0x81e4459C95F1033635568B80dA65139b48900506',
    usdt_addr: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
    popularized_addr: '0x44539e909271C665123A071cddaDAAF09c521e44',
    mining_addr_old: '0x321cD4100425a6033BE4887D274618E169165dBf',
    mining_addr: '0xe11Ec2125E0233a222E0b3aC1D778bB240eb8a06',
    activity_addr: '0x7999F30EA6a2Ea9745fcc52f7C13B0a987516ef1',
    helper_addr: '0xAF45b6395e5Ce6Ac236d236171Df95BFf794c42E',
  }

  beforeEach(async () => {
    wallet = new ethers.Wallet(privateKey, provider);
    qft = new ethers.Contract(config.qft_addr, JSON.stringify(QFT.abi), wallet.provider).connect(wallet);
    usdt = new ethers.Contract(config.usdt_addr, JSON.stringify(QFT.abi), wallet.provider).connect(wallet);

    popularized = new ethers.Contract(config.popularized_addr, JSON.stringify(Popularized.abi), wallet.provider).connect(wallet);
    mining = new ethers.Contract(config.mining_addr, JSON.stringify(Mining.abi), wallet.provider).connect(wallet);
    activity = new ethers.Contract(config.activity_addr, JSON.stringify(Activity.abi), wallet.provider).connect(wallet);
    helper = new ethers.Contract(config.helper_addr, JSON.stringify(Helper.abi), wallet.provider).connect(wallet);
  });

  async function get_vote(addr: any) {
    const ret = await mining.balanceOf(addr);
    console.log(addr, ethers.utils.formatEther(ret));
    const ret1 = await mining.spreads(addr);
    console.log(ret1);
    const childs = (await popularized.spreads(addr)).child;
    for (let i = 0; i < childs.length; i++) {
      await get_vote(childs[i]);
    }
  }


  it('Build', async () => {

  })
})
