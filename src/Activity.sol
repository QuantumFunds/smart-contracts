// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./interfaces/IUniswapV2Router01.sol";
import "./interfaces/IPopularized.sol";
import "./interfaces/IERC20.sol";
import "./MiningLib.sol";

interface IMining {
    function voteIn(uint value) external returns (uint256 ret);
}

contract Activity is Ownable, ReentrancyGuard {
    event Transfer(address indexed from, address indexed to, uint256 value);
    string public constant name = "QFT Activity";
    string public constant symbol = "QFTA";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    event Node(address indexed addr, bool b);
    event Buy(address indexed addr, address p, uint256 collect, uint256 value);
    mapping(address => bool) public nodeIs;

    function setNode(address addr, bool b) external onlyOwner {
        nodeIs[addr] = b;
        emit Node(addr, b);
    }

    address public proj_addr = 0x76e0aA5A5914C3f5c5b56B4B1cBbFcF131D61961;
    function setProj(address addr) external onlyOwner {
        proj_addr = addr;
    }

    bool public nodeStop = false;
    function setStop(bool b) external onlyOwner {
        nodeStop = b;
    }

    function transfer(address addr, uint value) external onlyOwner {
        IERC20(addr).transfer(msg.sender, value);
    }

    address immutable this_addr;

    constructor() {
        this_addr = address(this);
        IERC20(MiningLib.USDT).approve(MiningLib.Router, type(uint).max);
        IERC20(MiningLib.QFT).approve(MiningLib.Mining, type(uint).max);
    }

    function NodeAddress(
        address addr
    ) external view returns (address nodeAddr) {
        if (nodeIs[addr]) {
            nodeAddr = addr;
        } else {
            (address[] memory addrs, uint256 len) = IPopularized(
                MiningLib.Popularized
            ).parents(addr, 0);
            for (uint i = 0; i < len; i++) {
                if (nodeIs[addrs[i]]) {
                    nodeAddr = addrs[i];
                    break;
                }
            }
        }
    }

    function buyVote(uint256 usdt) external nonReentrant returns (uint ret) {
        address addr = msg.sender;
        require(addr == tx.origin, "addr error");
        IERC20(MiningLib.USDT).transferFrom(addr, this_addr, usdt);

        uint qft = getQFT(usdt / 2) * 2;
        buy(usdt);
        voteIn(qft);

        if (nodeStop) {
            IERC20(MiningLib.QFT).transfer(proj_addr, qft / 10);
            uint u = usdt / 10;
            balanceOf[proj_addr] += u;
            emit Transfer(this_addr, proj_addr, u);
            totalSupply += u;
            emit Buy(addr, address(0), totalSupply, usdt);
        } else {
            address nodeAddr = address(0);
            (address[] memory addrs, uint256 len) = IPopularized(
                MiningLib.Popularized
            ).parents(addr, 0);
            for (uint i = 0; i < len; i++) {
                if (nodeIs[addrs[i]]) {
                    nodeAddr = addrs[i];
                    break;
                }
            }
            if (nodeAddr == address(0)) {
                IERC20(MiningLib.QFT).transfer(proj_addr, qft / 5);
                uint u = usdt / 5;
                balanceOf[proj_addr] += u;
                emit Transfer(this_addr, proj_addr, u);
                totalSupply += u;

                emit Buy(addr, address(0), totalSupply, usdt);
            } else {
                IERC20(MiningLib.QFT).transfer(nodeAddr, qft / 10);
                uint u = usdt / 10;

                balanceOf[nodeAddr] += u;
                emit Transfer(this_addr, nodeAddr, u);
                totalSupply += u;

                IERC20(MiningLib.QFT).transfer(proj_addr, qft / 10);
                balanceOf[proj_addr] += u;
                emit Transfer(this_addr, proj_addr, u);
                totalSupply += u;

                emit Buy(addr, nodeAddr, totalSupply, usdt);
            }
        }
        ret = 0;
    }

    function voteIn(uint qft) private {
        IMining(MiningLib.Mining).voteIn(qft);
    }

    function buy(uint usdt) private returns (uint qft) {
        address[] memory path = new address[](2);
        path[0] = MiningLib.USDT;
        path[1] = MiningLib.QFT;
        uint[] memory ret = IUniswapV2Router01(MiningLib.Router)
            .swapExactTokensForTokens(
                usdt,
                0,
                path,
                this_addr,
                type(uint256).max
            );
        qft = ret[1];
    }

    function getQFT(uint usdt) public view returns (uint qft) {
        address[] memory path = new address[](2);
        path[0] = MiningLib.USDT;
        path[1] = MiningLib.QFT;
        uint[] memory ret = IUniswapV2Router01(MiningLib.Router).getAmountsOut(
            usdt,
            path
        );
        qft = ret[1];
    }

    address public proj_addr1 = 0xBF4B8985aFa6e715929D6368ef15E71a1711c760;
    function setProjAddr1(address addr) external onlyOwner {
        proj_addr1 = addr;
    }

    function confirm(address addr, uint256 usdt) external returns (uint ret) {
        require(msg.sender == proj_addr1, "addr error");
        IERC20(MiningLib.USDT).transferFrom(proj_addr1, this_addr, usdt);
        uint qft = (getQFT(1 ether) * usdt) / 1 ether;
        buy(usdt);
        IERC20(MiningLib.QFT).transfer(addr, qft);

        IERC20(MiningLib.QFT).transfer(proj_addr, qft / 5);
        balanceOf[proj_addr] += (usdt / 5);
        emit Transfer(this_addr, proj_addr, usdt / 5);
        totalSupply += (usdt / 5);
        ret = 0;
    }
}
