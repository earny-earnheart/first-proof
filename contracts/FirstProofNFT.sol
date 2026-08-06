// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FirstProofNFT
 * @dev ERC721 NFT with sequential minting, per-token metadata, and an optional supply cap.
 */
contract FirstProofNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    string private _baseTokenURI;

    /// @dev Zero means unlimited supply.
    uint256 public maxSupply;

    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event BaseURIUpdated(string newBaseURI);

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        uint256 _maxSupply
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
        maxSupply = _maxSupply;
    }

    function mintNFT(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;

        if (maxSupply > 0) {
            require(tokenId < maxSupply, "Max supply reached");
        }

        _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit NFTMinted(to, tokenId, uri);
        return tokenId;
    }

    function batchMint(address to, string[] memory uris) public onlyOwner {
        for (uint256 i = 0; i < uris.length; i++) {
            mintNFT(to, uris[i]);
        }
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
