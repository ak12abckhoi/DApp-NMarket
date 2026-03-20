const PINATA_JWT     = import.meta.env.VITE_PINATA_JWT || "";
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

// Upload file ảnh lên IPFS
export async function uploadFileToIPFS(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
  formData.append("pinataMetadata", JSON.stringify({ name: file.name }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

// Upload metadata JSON lên IPFS
export async function uploadMetadataToIPFS(metadata: object): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent:  metadata,
      pinataMetadata: { name: "nft-metadata.json" },
    }),
  });

  if (!res.ok) throw new Error(`Metadata upload failed: ${res.statusText}`);
  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

// Chuyển ipfs:// → HTTP URL để hiển thị ảnh
export function resolveIPFS(uri: string): string {
  if (!uri) return "/placeholder.png";
  if (uri.startsWith("ipfs://")) {
    return `${PINATA_GATEWAY}/${uri.replace("ipfs://", "")}`;
  }
  return uri;
}

// Fetch metadata từ tokenURI
export async function fetchMetadata(tokenURI: string) {
  try {
    const url = resolveIPFS(tokenURI);
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}