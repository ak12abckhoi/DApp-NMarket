// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./NFTCollection.sol";

contract NFTFactory {

    address public platformFeeRecipient;
    uint256 public deployFee;

    struct CollectionInfo {
        address contractAddress;
        address creator;
        string  name;
        string  symbol;
        uint256 deployedAt;
    }

    CollectionInfo[] public collections;
    mapping(address => address[]) public creatorCollections;
    mapping(address => bool)      public isRegistered;

    event CollectionCreated(address indexed collection, address indexed creator, string name, string symbol);

    constructor(address _feeRecipient, uint256 _deployFee) {
        platformFeeRecipient = _feeRecipient;
        deployFee            = _deployFee;
    }

    function createCollection(
        string calldata name,
        string calldata symbol,
        uint256 maxSupply,
        uint256 mintPrice,
        uint256 whitelistPrice,
        uint256 maxWLPerWallet,
        uint96  royaltyBps
    ) external payable returns (address) {
        require(msg.value >= deployFee,  "Insufficient deploy fee");
        require(royaltyBps <= 1000,      "Royalty max 10%");
        require(maxSupply > 0,           "Supply must be > 0");

        if (deployFee > 0) {
            (bool ok, ) = platformFeeRecipient.call{value: msg.value}("");
            require(ok, "Fee transfer failed");
        }

        NFTCollection col = new NFTCollection(
            name,
            symbol,
            maxSupply,
            mintPrice,
            whitelistPrice,
            maxWLPerWallet,
            msg.sender,
            royaltyBps
        );

        col.transferOwnership(msg.sender);

        address addr = address(col);
        collections.push(CollectionInfo({
            contractAddress: addr,
            creator:         msg.sender,
            name:            name,
            symbol:          symbol,
            deployedAt:      block.timestamp
        }));
        creatorCollections[msg.sender].push(addr);
        isRegistered[addr] = true;

        emit CollectionCreated(addr, msg.sender, name, symbol);
        return addr;
    }

    function totalCollections() external view returns (uint256) {
        return collections.length;
    }

    function getCollectionsByCreator(address creator) external view returns (address[] memory) {
        return creatorCollections[creator];
    }

    function getAllCollections() external view returns (CollectionInfo[] memory) {
        return collections;
    }

    function setDeployFee(uint256 newFee) external {
        require(msg.sender == platformFeeRecipient, "Not platform");
        deployFee = newFee;
    }
}