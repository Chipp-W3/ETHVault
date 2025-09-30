import { ethers } from "hardhat";

async function main() {

    // On récupère les signers disponibles (les 20 comptes de Hardhat par défaut)
    const signers = await ethers.getSigners();

    // Adresse du contrat Vault (affichée après déploiement)
    const vaultAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

    // Récupérer le contrat Vault
    const Vault = await ethers.getContractFactory("Vault");
    const vault = Vault.attach(vaultAddress);

    const [alice, bob] = await ethers.getSigners();

    await vault.connect(alice).deposit({ value: ethers.parseEther("5") });
    await vault.connect(bob).deposit({ value: ethers.parseEther("12") });
}

// Exécution du script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERREUR:", error);
    process.exit(1);
  });
