// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IPopularized.sol";
import "./MiningLib.sol";

interface IMining {
    struct Info {
        uint256 airdrop;
        uint256 vote;
        uint256 vote_power;
        uint256 real_power;
        uint256 out_vote;
        uint64 out_height;
        uint128 epoch;
    }

    function spreads(address addr) external view returns (Info memory obj);

    function begin() external view returns (uint);

    function epoch() external view returns (uint128);

    function epoch_height() external view returns (uint128);
    function profits(uint epoch) external view returns (uint);
    function totalSupply() external view returns (uint);
    function whole_power() external view returns (uint);
    function spreadPower(address) external view returns (uint);

    struct power_profit {
        uint256 power;
        uint256 profit;
    }
    function power_profit_whole(uint256) external view returns (power_profit memory obj);
}

contract Helper is Ownable {
    address public Popularized = MiningLib.Popularized;
    address public Mining = MiningLib.Mining;

    function setPopularized(address addr) external onlyOwner {
        Popularized = addr;
    }

    function setMining(address addr) external onlyOwner {
        Mining = addr;
    }

    struct Info {
        address addr;
        IMining.Info info;
    }

    function MiningInfo(
        address addr
    )
        external
        view
        returns (
            uint bn,
            uint totalSupply,
            uint whole_power,
            uint real_power,
            uint begin,
            uint128 epoch,
            uint128 epoch_height,
            uint profit,
            Info[] memory infos
        )
    {
        bn = block.number;
        begin = IMining(Mining).begin();
        epoch = IMining(Mining).epoch();
        epoch_height = IMining(Mining).epoch_height();
        totalSupply = IMining(Mining).totalSupply();
        whole_power = IMining(Mining).whole_power();
        real_power = IMining(Mining).spreadPower(addr);
        profit = IMining(Mining).profits(epoch / 13) / 13;
        
        (address parent, address[] memory child) = IPopularized(Popularized)
            .spreads(addr);
        infos = new Info[](child.length + 2);
        infos[0] = Info({addr: parent, info: IMining(Mining).spreads(parent)});
        infos[1] = Info({addr: addr, info: IMining(Mining).spreads(addr)});
        for (uint i = 0; i < child.length; i++) {
            infos[i + 2] = Info({
                addr: child[i],
                info: IMining(Mining).spreads(child[i])
            });
        }
    }

    function Mint(address addr) public view returns(uint mint) {
        IMining.Info memory info = IMining(Mining).spreads(addr);
        IMining.power_profit memory obj = IMining(Mining).power_profit_whole(info.epoch);
         if (obj.power > 0 && info.real_power > 0) {
            mint = (obj.profit * info.real_power) / obj.power;
         } else {
            mint = 0;
         }
    }
}
