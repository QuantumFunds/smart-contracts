// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./interfaces/IPopularized.sol";
import "./interfaces/IERC20.sol";
import "./libraries/MathPow.sol";
import "./MiningLib.sol";

contract Mining is ReentrancyGuard {
    event Transfer(address indexed from, address indexed to, uint256 value);
    string public constant name = "QFT Mining";
    string public constant symbol = "QFTM";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    function balanceOf(address owner) external view returns (uint256) {
        uint256 vote1 = spreads[owner].vote;
        uint256 vote2 = spreads[owner].out_vote;
        uint256 vote3 = spreads[owner].airdrop;
        return vote1 + vote2 + vote3;
    }

    event Profit(uint256 indexed epoch, uint256 value);
    event VotePower(
        address indexed addr,
        uint256 vote,
        uint256 power,
        uint256 totalSupply,
        uint256 whole_power,
        uint128 epoch
    );
    event MiningIncome(address indexed addr, uint256 value, uint128 epoch);

    struct Info {
        uint256 airdrop;
        uint256 vote;
        uint256 vote_power;
        uint256 real_power;
        uint256 out_vote;
        uint64 out_height;
        uint128 epoch;
    }
    mapping(address => Info) public spreads;

    address public constant popularize = MiningLib.Popularized;

    uint256 public constant begin = 32017215;
    uint128 public epoch = 1;

    // 7 day (opBNB: One fast per second)
    uint128 public constant epoch_height = 1 weeks;
    uint256 public constant height_profit = 1 ether;

    struct power_profit {
        uint256 power;
        uint256 profit;
    }
    uint256 public whole_power = 0;
    mapping(uint256 => power_profit) public power_profit_whole;

    mapping(uint256 => uint256) public profits;

    function add_profit(uint value) external {
        IERC20(MiningLib.QFT).transferFrom(msg.sender, address(this), value);
        // 13 weeks
        profits[epoch / 13 + 1] += value;
        emit Profit(epoch, value);
    }
    
    /*
    constructor() {
    }*/

    function airdropsIn(
        address to,
        uint value
    ) external nonReentrant returns (uint256 ret) {
        IERC20(MiningLib.QFT).transferFrom(msg.sender, address(this), value);
        require(value > 0, "Amount should be greater than");
        spreads[to].airdrop += value;
        totalSupply += value;
        emit Transfer(address(0), to, value);
        spreads[to].vote_power = MathPow.vote2power(
            spreads[to].vote + spreads[to].airdrop
        );
        ret = 0;
    }

    function voteIn(uint value) external nonReentrant returns (uint256 ret) {
        address addr = tx.origin;
        IERC20(MiningLib.QFT).transferFrom(msg.sender, address(this), value);
        (address parent, address[] memory child) = IPopularized(popularize)
            .spreads(addr);
        require(
            parent != address(0),
            "Parent address is not a generalization set"
        );
        totalSupply += value;
        spreads[addr].vote += value;
        emit Transfer(address(0), addr, value);
        spreads[addr].vote_power = MathPow.vote2power(
            spreads[addr].vote + spreads[addr].airdrop
        );
        _voteMining(addr, parent, child);
        ret = 0;
    }

    function voteOut1(
        uint256 value
    ) external nonReentrant returns (uint256 ret) {
        address addr = tx.origin;
        require(value > 0, "Amount is zero");
        spreads[addr].vote -= value;

        spreads[addr].vote_power = MathPow.vote2power(
            spreads[addr].vote + spreads[addr].airdrop
        );
        require(spreads[addr].out_vote == 0, "out_vote > 0");
        spreads[addr].out_vote = value;
        spreads[addr].out_height = uint64(block.number);
        (address parent, address[] memory child) = IPopularized(popularize)
            .spreads(addr);
        _voteMining(addr, parent, child);
        ret = 0;
    }

    function voteOut2() external nonReentrant returns (uint256 ret) {
        address addr = tx.origin;
        require(
            (block.number - spreads[addr].out_height) > 2 * epoch_height,
            "voteOut2 error"
        );
        uint value = spreads[addr].out_vote;
        totalSupply -= value;
        spreads[addr].out_vote = 0;
        IERC20(MiningLib.QFT).transfer(addr, value);
        emit Transfer(addr, address(0), value);
        ret = 0;
    }

    function voteMining() external nonReentrant returns (uint256 ret) {
        address addr = tx.origin;
        (address parent, address[] memory child) = IPopularized(popularize)
            .spreads(addr);
        require(
            parent != address(0),
            "Parent address is not a generalization set"
        );
        _voteMining(addr, parent, child);
        ret = 0;
    }

    function changeAddress(
        address addr_old,
        address addr_new
    ) external nonReentrant returns (uint ret) {
        require(msg.sender == addr_new);
        require(
            IPopularized(popularize).addressChange(addr_new) == addr_old,
            "addr error"
        );

        (address parent, ) = IPopularized(popularize).spreads(addr_old);
        require(parent == address(0), "parent error1");

        (parent, ) = IPopularized(popularize).spreads(addr_new);
        require(parent != address(0), "parent error2");

        uint value = spreads[addr_old].vote +
            spreads[addr_old].out_vote +
            spreads[addr_old].airdrop;
        require(value > 0, "Amount is zero");

        require(spreads[addr_new].epoch == 0, "epoch error");
        spreads[addr_new].epoch = spreads[addr_old].epoch;

        require(spreads[addr_new].vote == 0, "vote error");
        spreads[addr_new].vote = spreads[addr_old].vote;

        require(spreads[addr_new].out_vote == 0, "out_vote error");
        spreads[addr_new].out_vote = spreads[addr_old].out_vote;

        require(spreads[addr_new].out_height == 0, "out_height error");
        spreads[addr_new].out_height = spreads[addr_old].out_height;

        require(spreads[addr_new].airdrop == 0, "airdrop error");
        spreads[addr_new].airdrop = spreads[addr_old].airdrop;

        require(spreads[addr_new].vote_power == 0, "vote_power error");
        spreads[addr_new].vote_power = spreads[addr_old].vote_power;

        require(spreads[addr_new].real_power == 0, "real_power error");
        spreads[addr_new].real_power = spreads[addr_old].real_power;

        delete spreads[addr_old];
        ret = 0;
    }

    function spreadPower(address addr) external view returns (uint256) {
        (address parent, address[] memory child) = IPopularized(popularize)
            .spreads(addr);
        return _spreadPower(addr, parent, child);
    }

    function _update() private returns (bool) {
        if (block.number > begin + (epoch * epoch_height)) {
            //9.5 * 10**8 / (24 * 3600 * 7) = 1570.7671957671957
            uint p = profits[epoch / 13] / 13;
            if (epoch > 1572) {
                power_profit_whole[epoch] = power_profit({
                    power: whole_power,
                    profit: p
                });
            } else if (epoch == 1572) {
                power_profit_whole[epoch] = power_profit({
                    power: whole_power,
                    profit: (464000 ether) + p
                });
            } else {
                power_profit_whole[epoch] = power_profit({
                    power: whole_power,
                    profit: (height_profit * epoch_height) + p
                });
            }
            epoch += 1;
            whole_power = 0;
            return true;
        } else {
            return false;
        }
    }

    function _spreadPower(
        address addr,
        address parent,
        address[] memory child
    ) private view returns (uint256) {
        uint256 v = spreads[addr].vote_power;
        uint256 sum = v * 6;
        sum = sum + MathPow.min(v, spreads[parent].vote_power);
        uint256 n = child.length;
        for (uint256 i = 0; i < n; i++) {
            sum += MathPow.min(v, spreads[child[i]].vote_power);
        }
        return sum;
    }

    function _voteMining(
        address addr,
        address parent,
        address[] memory child
    ) private returns (uint256 mint, uint256 f) {
        _update();
        if (spreads[addr].epoch < epoch) {
            mint = 0;
            uint old_epoch = spreads[addr].epoch;
            uint256 old_profit = power_profit_whole[old_epoch].profit;
            uint256 old_power = power_profit_whole[old_epoch].power;
            if (old_power > 0 && spreads[addr].real_power > 0) {
                mint = (old_profit * (spreads[addr].real_power)) / old_power;
                if (mint > 0) {
                    IERC20(MiningLib.QFT).transfer(addr, mint);
                    emit MiningIncome(addr, mint, epoch);
                }
            }
            spreads[addr].epoch = epoch;
            spreads[addr].real_power = 0;
        }
        uint256 old_s = spreads[addr].real_power;
        uint256 s = _spreadPower(addr, parent, child);

        if (s > old_s) {
            whole_power += (s - old_s);
            spreads[addr].real_power = s;
            emit VotePower(
                addr,
                spreads[addr].vote,
                s,
                totalSupply,
                whole_power,
                epoch
            );
        }
        f = s;
    }
}
