export function detectNetwork({
  name,
  type
}: {
  name: string;
  type?: string;
}) {
  const nameLower = name.toLowerCase();
  let finalType = type || "";
  let finalName = name;

  // -------------------
  // AUTO DETECT TYPE + NAME
  // -------------------
  if (!finalType) {
    if (/(eth|erc)/.test(nameLower)) {
      finalType = "ERC-20";
      finalName = "Ethereum";
    } 
    else if (/(bsc|binance|bep)/.test(nameLower)) {
      finalType = "BEP-20";
      finalName = "Binance Smart Chain";
    } 
    else if (/(tron|trc)/.test(nameLower)) {
      finalType = "TRC-20";
      finalName = "Tron Network";
    } 
    else if (/(btc|bitcoin)/.test(nameLower)) {
      finalType = "Native";
      finalName = "Bitcoin";
    } 
    else if (/(polygon|matic)/.test(nameLower)) {
      finalType = "ERC-20";
      finalName = "Polygon";
    } 
    else if (/(solana|sol)/.test(nameLower)) {
      finalType = "Native";
      finalName = "Solana";
    } 
    else if (/(ton)/.test(nameLower)) {
      finalType = "Native";
      finalName = "TON";
    } 
    else if (/(avax|avalanche)/.test(nameLower)) {
      finalType = "ERC-20";
      finalName = "Avalanche";
    } 
    else if (/(ftm|fantom)/.test(nameLower)) {
      finalType = "ERC-20";
      finalName = "Fantom";
    } 
    else if (/(ada|cardano)/.test(nameLower)) {
      finalType = "Native";
      finalName = "Cardano";
    } 
    else if (/(xrp|ripple)/.test(nameLower)) {
      finalType = "Native";
      finalName = "Ripple";
    } 
    else if (/(doge|dogecoin)/.test(nameLower)) {
      finalType = "Native";
      finalName = "Dogecoin";
    } 
    else if (/(ltc|litecoin)/.test(nameLower)) {
      finalType = "Native";
      finalName = "Litecoin";
    } 
    else {
      finalType = "Native"; // fallback
    }
  }

  // -------------------
  // AUTO DETECT NETWORK: mainnet / testnet
  // -------------------
  let finalNetwork = "mainnet";
  if (/test/.test(nameLower)) finalNetwork = "testnet";

  // -------------------
  // SLUGS + AUTO ID
  // -------------------
  const typeSlug = finalType.toLowerCase().replace(/[^a-z0-9]/g, "");
  const networkSlug = finalNetwork.toLowerCase();
  const id = `${typeSlug}-${networkSlug}`;

  return {
    id,
    type: finalType,
    name: finalName,
    network: finalNetwork
  };
}
