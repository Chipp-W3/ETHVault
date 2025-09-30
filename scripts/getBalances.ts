import { ethers } from "hardhat";

async function main() {
  // On récupère les signers disponibles (les 20 comptes de Hardhat par défaut)
  const signers = await ethers.getSigners();

  // Adresse du contrat Vault (affichée après déploiement)
  const vaultAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

  // Récupérer le contrat Vault
  const Vault = await ethers.getContractFactory("Vault");
  const vault = Vault.attach(vaultAddress);

  console.log("📊 Balances dans le Vault:\n");

  // Boucler sur tous les comptes
  for (let i = 0; i < signers.length; i++) {
    const address = await signers[i].getAddress();

    // Appel de ta fonction Solidity `getBalance(address)`
    const balance = await vault.getBalance(address);

    console.log(`Compte #${i} (${address}) → ${ethers.formatEther(balance)} ETH`);
  }

  // En bonus : afficher aussi le solde ETH total du contrat
  const vaultBalance = await ethers.provider.getBalance(vault.address);
  console.log(`\n💰 Solde total du contrat Vault: ${ethers.formatEther(vaultBalance)} ETH`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
