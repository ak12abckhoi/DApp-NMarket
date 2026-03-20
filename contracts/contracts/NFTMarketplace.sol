// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ReentrancyGuard, Ownable {

    enum ListingType   { FixedPrice, Auction }
    enum ListingStatus { Active, Sold, Cancelled }

    struct Listing {
        uint256       listingId;
        address       nftContract;
        uint256       tokenId;
        address payable seller;
        uint256       price;
        uint256       endTime;
        address       highestBidder;
        uint256       highestBid;
        ListingType   listingType;
        ListingStatus status;
    }

    uint256 public totalListings;
    uint256 public platformFeePercent;
    address payable public feeRecipient;

    mapping(uint256 => Listing)  public listings;
    mapping(address => uint256)  public pendingWithdrawals;

    event Listed(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price, ListingType listingType);
    event Sale(uint256 indexed listingId, address buyer, uint256 price);
    event BidPlaced(uint256 indexed listingId, address bidder, uint256 amount);
    event AuctionSettled(uint256 indexed listingId, address winner, uint256 amount);
    event ListingCancelled(uint256 indexed listingId);

    constructor(uint256 _platformFeePercent, address payable _feeRecipient) {
        platformFeePercent = _platformFeePercent;
        feeRecipient       = _feeRecipient;
    }

    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        ListingType listingType,
        uint256 auctionDuration
    ) external nonReentrant returns (uint256) {
        require(price > 0, "Price must be > 0");
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        uint256 listingId = totalListings++;
        uint256 endTime   = listingType == ListingType.Auction
            ? block.timestamp + auctionDuration
            : 0;

        listings[listingId] = Listing({
            listingId:     listingId,
            nftContract:   nftContract,
            tokenId:       tokenId,
            seller:        payable(msg.sender),
            price:         price,
            endTime:       endTime,
            highestBidder: address(0),
            highestBid:    0,
            listingType:   listingType,
            status:        ListingStatus.Active
        });

        emit Listed(listingId, nftContract, tokenId, msg.sender, price, listingType);
        return listingId;
    }

    function buyNFT(uint256 listingId) external payable nonReentrant {
        Listing storage l = listings[listingId];
        require(l.status == ListingStatus.Active, "Not active");
        require(l.listingType == ListingType.FixedPrice, "Use placeBid");
        require(msg.value >= l.price, "Insufficient payment");

        l.status = ListingStatus.Sold;
        _distribute(l, msg.sender, msg.value);
        emit Sale(listingId, msg.sender, msg.value);
    }

    function placeBid(uint256 listingId) external payable nonReentrant {
        Listing storage l = listings[listingId];
        require(l.status == ListingStatus.Active, "Not active");
        require(l.listingType == ListingType.Auction, "Not an auction");
        require(block.timestamp < l.endTime, "Auction ended");
        require(msg.value > l.highestBid && msg.value >= l.price, "Bid too low");

        if (l.highestBidder != address(0)) {
            pendingWithdrawals[l.highestBidder] += l.highestBid;
        }

        l.highestBidder = msg.sender;
        l.highestBid    = msg.value;
        emit BidPlaced(listingId, msg.sender, msg.value);
    }

    function settleAuction(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        require(l.status == ListingStatus.Active, "Not active");
        require(l.listingType == ListingType.Auction, "Not an auction");
        require(block.timestamp >= l.endTime, "Auction still running");

        l.status = ListingStatus.Sold;

        if (l.highestBidder != address(0)) {
            _distribute(l, l.highestBidder, l.highestBid);
            emit AuctionSettled(listingId, l.highestBidder, l.highestBid);
        } else {
            IERC721(l.nftContract).transferFrom(address(this), l.seller, l.tokenId);
            emit AuctionSettled(listingId, address(0), 0);
        }
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        require(l.seller == msg.sender || owner() == msg.sender, "Not authorized");
        require(l.status == ListingStatus.Active, "Not active");
        require(l.highestBid == 0, "Bids exist");

        l.status = ListingStatus.Cancelled;
        IERC721(l.nftContract).transferFrom(address(this), l.seller, l.tokenId);
        emit ListingCancelled(listingId);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");
    }

    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Max 10%");
        platformFeePercent = newFee;
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function _distribute(Listing storage l, address buyer, uint256 salePrice) internal {
        IERC721(l.nftContract).transferFrom(address(this), buyer, l.tokenId);

        uint256 fee      = (salePrice * platformFeePercent) / 10000;
        uint256 royalty  = 0;

        try IERC2981(l.nftContract).royaltyInfo(l.tokenId, salePrice) returns (address receiver, uint256 amount) {
            if (amount > 0 && receiver != address(0)) {
                royalty = amount;
                pendingWithdrawals[receiver] += royalty;
            }
        } catch {}

        pendingWithdrawals[l.seller]  += salePrice - fee - royalty;
        pendingWithdrawals[feeRecipient] += fee;
    }
}