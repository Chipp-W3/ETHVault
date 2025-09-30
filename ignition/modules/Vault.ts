import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Module de déploiement pour le contrat Vault
 * Utilise Hardhat Ignition pour le déploiement
 */
const VaultModule = buildModule("VaultModule", (m) => {
  // Durée de verrouillage par défaut : 10 blocs
  // Vous pouvez modifier cette valeur selon vos besoins
  // Sur un réseau local, cela représente environ 10 blocs
  // Sur Ethereum mainnet, cela représente environ 2 minutes (12s par bloc)
  const lockDuration = m.getParameter("lockDuration", 10);

  // Déploiement du contrat Vault avec la durée de verrouillage
  const vault = m.contract("Vault", [lockDuration]);

  return { vault };
});

export default VaultModule;