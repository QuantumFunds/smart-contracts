// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPopularized {
    function parents(
        address addr,
        uint256 n
    ) external view returns (address[] memory addrs, uint256 len);

    function addressChange(address addr_new) external view returns (address);

    function spreads(
        address addr
    ) external view returns (address parent, address[] memory child);
}
