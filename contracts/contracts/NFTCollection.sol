// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTCollection is ERC721URIStorage, ERC721Royalty, Ownable {

    uint256 public nextTokenId;
    uint256 public maxSupply;
    uint256 public mintPrice;
    uint256 public whitelistPrice;
    bool public publicMintEnabled;
    bool public whitelistMintEnabled;

    mapping(address => bool)    public whitelist;
    mapping(address => uint256) public whitelistMinted;
    uint256 public maxWhitelistMintPerWallet;

    event Minted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 whitelistPrice_,
        uint256 maxWLPerWallet_,
        address royaltyReceiver_,
        uint96  royaltyBps_
    ) ERC721(name_, symbol_) {
        maxSupply                 = maxSupply_;
        mintPrice                 = mintPrice_;
        whitelistPrice            = whitelistPrice_;
        maxWhitelistMintPerWallet = maxWLPerWallet_;
        _setDefaultRoyalty(royaltyReceiver_, royaltyBps_);
    }

    function mint(address to, string calldata uri) external payable returns (uint256) {
        require(publicMintEnabled,       "Public mint closed");
        require(msg.value >= mintPrice,  "Insufficient payment");
        require(nextTokenId < maxSupply, "Sold out");
        return _mintToken(to, uri);
    }

    function whitelistMint(string calldata uri) external payable returns (uint256) {
        require(whitelistMintEnabled,                                    "Whitelist mint closed");
        require(whitelist[msg.sender],                                   "Not whitelisted");
        require(msg.value >= whitelistPrice,                             "Insufficient payment");
        require(nextTokenId < maxSupply,                                 "Sold out");
        require(whitelistMinted[msg.sender] < maxWhitelistMintPerWallet, "Limit reached");
        whitelistMinted[msg.sender]++;
        return _mintToken(msg.sender, uri);
    }

    function ownerMint(address to, string calldata uri) external onlyOwner returns (uint256) {
        require(nextTokenId < maxSupply, "Sold out");
        return _mintToken(to, uri);
    }

    function ownerBatchMint(address[] calldata recipients, string[] calldata uris) external onlyOwner {
        require(recipients.length == uris.length,                    "Length mismatch");
        require(nextTokenId + recipients.length <= maxSupply,        "Exceeds max supply");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mintToken(recipients[i], uris[i]);
        }
    }

    function setWhitelist(address account, bool status) external onlyOwner {
        whitelist[account] = status;
    }

    function setBatchWhitelist(address[] calldata accounts, bool status) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = status;
        }
    }

    function togglePublicMint()           external onlyOwner { publicMintEnabled    = !publicMintEnabled; }
    function toggleWhitelistMint()        external onlyOwner { whitelistMintEnabled = !whitelistMintEnabled; }
    function setMintPrice(uint256 p)      external onlyOwner { mintPrice            = p; }
    function setWhitelistPrice(uint256 p) external onlyOwner { whitelistPrice       = p; }

    function withdraw() external onlyOwner {
        (bool ok, ) = owner().call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }

    function totalSupply() external view returns (uint256) { return nextTokenId; }
    function remaining()   external view returns (uint256) { return maxSupply - nextTokenId; }

    function _mintToken(address to, string memory uri) internal returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit Minted(to, tokenId, uri);
    }

    function tokenURI(uint256 tokenId)
        public view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view
        override(ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721URIStorage, ERC721Royalty)
    {
        super._burn(tokenId);
    }
}
