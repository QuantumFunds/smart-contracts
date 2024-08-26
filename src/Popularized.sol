// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Popularized {
    event Transfer(address indexed from, address indexed to, uint256 value);

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(this)) {
            return 1;
        } else if (_spreads[owner].parent == address(0)) {
            return 0;
        } else {
            return _spreads[owner].child.length;
        }
    }

    string public constant name = "QFT Popularized";
    string public constant symbol = "QFTP";
    uint8 public constant decimals = 0;

    struct Info {
        address parent;
        address[] child;
    }

    mapping(address => address) public addressChange;
    mapping(address => Info) private _spreads;
    uint256 public totalSupply;

    function spreads(
        address addr
    ) external view returns (address parent, address[] memory child) {
        parent = _spreads[addr].parent;
        child = _spreads[addr].child;
    }

    bytes32 public immutable DOMAIN_SEPARATOR;
    //keccak256("popularize(address addr_p,address addr_c,uint256 index)");
    bytes32 public constant PERMIT_TYPEHASH_POPULARIZE =
        0x33dea7307cd289a00f0f2571b521135712218c8a9a008e20e7770e6c85136b31;
    //keccak256("changeAddress(address addr_old,address addr_new)");
    bytes32 public constant PERMIT_TYPEHASH_CHANGE =
        0xe2049ff50b6fb934b85e93888bd814b82f486abff55ae9b1922567f5a20b44f3;

    constructor(address root_addr) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );
        address addr = address(this);
        emit Transfer(root_addr, addr, 1);
        totalSupply = 1;
        _spreads[root_addr] = Info({
            parent: addr,
            child: new address[](0)
        });
    }

    function popularize1(
        address addr_c,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bool ret) {
        address addr_p = msg.sender;
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(PERMIT_TYPEHASH_POPULARIZE, addr_p, addr_c, 0)
                )
            )
        );
        require(addr_c == ecrecover(digest, v, r, s), "signature data error");
        return popularize(addr_p, addr_c);
    }

    function popularize2(
        address addr_p,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bool ret) {
        address addr_c = msg.sender;
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(PERMIT_TYPEHASH_POPULARIZE, addr_p, addr_c, 0)
                )
            )
        );
        require(addr_p == ecrecover(digest, v, r, s), "signature data error");
        return popularize(addr_p, addr_c);
    }

    function popularize3(
        address addr_c,
        address temp,
        uint8 addr_v,
        bytes32 addr_r,
        bytes32 addr_s,
        uint8 temp_v,
        bytes32 temp_r,
        bytes32 temp_s
    ) external returns (bool ret) {
        address addr_p = msg.sender;
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(PERMIT_TYPEHASH_POPULARIZE, addr_c, temp, 0)
                )
            )
        );
        require(
            addr_c == ecrecover(digest, addr_v, addr_r, addr_s),
            "signature data1 error"
        );
        require(
            temp ==
                ecrecover(
                    keccak256(abi.encodePacked(addr_p)),
                    temp_v,
                    temp_r,
                    temp_s
                ),
            "signature data2 error"
        );
        return popularize(addr_p, addr_c);
    }

    function popularize4(
        address addr_p,
        address temp,
        uint8 addr_v,
        bytes32 addr_r,
        bytes32 addr_s,
        uint8 temp_v,
        bytes32 temp_r,
        bytes32 temp_s
    ) external returns (bool ret) {
        address addr_c = msg.sender;
        uint256 index = _spreads[addr_p].child.length + 1;
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(PERMIT_TYPEHASH_POPULARIZE, addr_p, temp, index)
                )
            )
        );
        require(
            addr_p == ecrecover(digest, addr_v, addr_r, addr_s),
            "signature data1 error"
        );
        require(
            temp ==
                ecrecover(
                    keccak256(abi.encodePacked(addr_c)),
                    temp_v,
                    temp_r,
                    temp_s
                ),
            "signature data2 error"
        );
        return popularize(addr_p, addr_c);
    }

    function popularize(
        address addr_p,
        address addr_c
    ) private returns (bool ret) {
        require(
            _spreads[addr_p].parent != address(0),
            "parent address is not a generalization set"
        );
        require(
            _spreads[addr_c].parent == address(0),
            "address has been promoted"
        );
        require(
            _spreads[addr_p].child.length < 36,
            "popularize times cannot be greater than 36"
        );
        _spreads[addr_c] = Info({parent: addr_p, child: new address[](0)});
        _spreads[addr_p].child.push(addr_c);
        totalSupply++;
        emit Transfer(addr_c, addr_p, 1);
        ret = true;
    }

    function changeAddress1(
        address addr_old,
        address addr_new,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bool) {
        address addr = msg.sender;
        require(_spreads[addr_old].parent == addr, "addr_old error");
        require(_spreads[addr_new].parent == address(0), "addr_new error");
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(PERMIT_TYPEHASH_CHANGE, addr_old, addr_new)
                )
            )
        );
        require(addr_old == ecrecover(digest, v, r, s), "signature data error");
        return changeAddress(addr, addr_old, addr_new);
    }

    function changeAddress2(
        address addr_old,
        address addr_new,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bool) {
        address addr = msg.sender;
        require(addr == addr_old, "addr_old error");
        require(_spreads[addr_new].parent == address(0), "addr_new error");

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(PERMIT_TYPEHASH_CHANGE, addr_old, addr_new)
                )
            )
        );
        address parent = ecrecover(digest, v, r, s);
        require(_spreads[addr].parent == parent, "signature data error");
        return changeAddress(parent, addr_old, addr_new);
    }

    function changeAddress(
        address parent,
        address addr_old,
        address addr_new
    ) private returns (bool) {
        _spreads[addr_new] = Info({
            parent: _spreads[addr_old].parent,
            child: _spreads[addr_old].child
        });
        address[] memory addrs = _spreads[parent].child;
        for (uint256 i = 0; i < addrs.length; i++) {
            if (addrs[i] == addr_old) {
                _spreads[parent].child[i] = addr_new;
            }
        }
        addrs = _spreads[addr_old].child;
        for (uint256 i = 0; i < addrs.length; i++) {
            _spreads[addrs[i]].parent = addr_new;
        }
        delete _spreads[addr_old];
        addressChange[addr_new] = addr_old;
        emit Transfer(addr_old, addr_new, _spreads[addr_new].child.length);
        return true;
    }

    function parents(
        address addr,
        uint256 n
    ) external view returns (address[] memory addrs, uint256 len) {
        address addr_temp = addr;
        address this_addr = address(this);
        len = 0;
        while (
            _spreads[addr_temp].parent != this_addr &&
            _spreads[addr_temp].parent != address(0)
        ) {
            addr_temp = _spreads[addr_temp].parent;
            len++;
            if (len == n) {
                break;
            }
        }
        addrs = new address[](len);

        addr_temp = addr;
        uint new_len = 0;
        while (new_len < len) {
            addr_temp = _spreads[addr_temp].parent;
            addrs[new_len] = addr_temp;
            new_len++;
        }
    }
}
