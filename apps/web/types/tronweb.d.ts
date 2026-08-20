declare module "tronweb" {
  const TronWeb: {
    address: {
      fromHex(hex: string): string;
      toHex(base58: string): string;
    };
  };
  export default TronWeb;
}
