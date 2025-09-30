import { ethers } from "hardhat";
import { Vault } from "../typechain-types";

/**
 * Fonction utilitaire pour afficher un séparateur
 */
function printSeparator(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

/**
 * Fonction utilitaire pour afficher les informations d'un utilisateur
 */
async function printUserInfo(
  vault: Vault,
  name: string,
  address: string
) {
  const balance = await vault.balances(address);
  const unlockBlock = await vault.unlockBlock(address);
  const currentBlock = await ethers.provider.getBlockNumber();
  const isUnlocked = await vault.isUnlocked(address);
  const blocksRemaining = unlockBlock > BigInt(currentBlock) 
    ? Number(unlockBlock) - currentBlock 
    : 0;

  console.log(`\n👤 ${name} (${address})`);
  console.log(`   💰 Solde dans le vault: ${ethers.formatEther(balance)} ETH`);
  console.log(`   📦 Bloc actuel: ${currentBlock}`);
  console.log(`   🔓 Bloc de déverrouillage: ${unlockBlock}`);
  console.log(`   ⏳ Blocs restants: ${blocksRemaining}`);
  console.log(`   ${isUnlocked ? "✅ Fonds déverrouillés" : "🔒 Fonds verrouillés"}`);
}

/**
 * Fonction pour miner des blocs
 */
async function mineBlocks(count: number) {
  console.log(`\n⛏️  Mining ${count} bloc(s)...`);
  for (let i = 0; i < count; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log(`   ✅ Nouveau bloc actuel: ${currentBlock}`);
}

/**
 * Script principal de scénario
 */
async function main() {
  printSeparator("🚀 DÉMARRAGE DU SCÉNARIO VAULT");

  // 1. Récupération des comptes
  console.log("\n📋 Récupération des comptes...");
  const [deployer, alice, bob] = await ethers.getSigners();
  
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Alice: ${alice.address}`);
  console.log(`   Bob: ${bob.address}`);

  // 2. Déploiement du contrat Vault
  printSeparator("📝 DÉPLOIEMENT DU CONTRAT VAULT");
  
  const LOCK_DURATION = 5; // 5 blocs de verrouillage
  console.log(`\n⚙️  Configuration: Lock duration = ${LOCK_DURATION} blocs`);
  
  const VaultFactory = await ethers.getContractFactory("Vault");
  const vault = await VaultFactory.deploy(LOCK_DURATION);
  await vault.waitForDeployment();
  
  const vaultAddress = await vault.getAddress();
  console.log(`✅ Vault déployé à: ${vaultAddress}`);
  console.log(`   Propriétaire: ${await vault.owner()}`);

  // 3. Affichage des soldes initiaux ETH
  printSeparator("💵 SOLDES ETH INITIAUX");
  
  const aliceInitialEth = await ethers.provider.getBalance(alice.address);
  const bobInitialEth = await ethers.provider.getBalance(bob.address);
  
  console.log(`   Alice: ${ethers.formatEther(aliceInitialEth)} ETH`);
  console.log(`   Bob: ${ethers.formatEther(bobInitialEth)} ETH`);

  // 4. Alice dépose 3 ETH
  printSeparator("💰 ALICE DÉPOSE 3 ETH");
  
  const aliceDepositAmount = ethers.parseEther("3.0");
  console.log(`\n📤 Alice dépose ${ethers.formatEther(aliceDepositAmount)} ETH...`);
  
  const aliceDepositTx = await vault.connect(alice).deposit({ 
    value: aliceDepositAmount 
  });
  await aliceDepositTx.wait();
  
  console.log(`✅ Dépôt réussi! Transaction: ${aliceDepositTx.hash}`);
  await printUserInfo(vault, "Alice", alice.address);

  // 5. Bob dépose 2 ETH
  printSeparator("💰 BOB DÉPOSE 2 ETH");
  
  const bobDepositAmount = ethers.parseEther("2.0");
  console.log(`\n📤 Bob dépose ${ethers.formatEther(bobDepositAmount)} ETH...`);
  
  const bobDepositTx = await vault.connect(bob).deposit({ 
    value: bobDepositAmount 
  });
  await bobDepositTx.wait();
  
  console.log(`✅ Dépôt réussi! Transaction: ${bobDepositTx.hash}`);
  await printUserInfo(vault, "Bob", bob.address);

  // 6. Vérification du solde total du contrat
  printSeparator("🏦 SOLDE TOTAL DU VAULT");
  
  const contractBalance = await vault.getContractBalance();
  console.log(`   💎 Total dans le vault: ${ethers.formatEther(contractBalance)} ETH`);

  // 7. Tentative de retrait immédiat par Alice (devrait échouer)
  printSeparator("❌ ALICE TENTE DE RETIRER IMMÉDIATEMENT");
  
  console.log("\n🚨 Alice essaie de retirer 1 ETH avant le déverrouillage...");
  
  try {
    await vault.connect(alice).withdraw(ethers.parseEther("1.0"));
    console.log("   ⚠️  ERREUR: Le retrait aurait dû échouer!");
  } catch (error: any) {
    console.log("   ✅ Retrait bloqué comme prévu!");
    console.log(`   💬 Raison: ${error.message.split("reverted with reason string")[1] || "Fonds encore verrouillés"}`);
  }

  // 8. On mine 3 blocs (pas encore suffisant pour Alice ni Bob)
  printSeparator("⛏️  MINING 3 BLOCS");
  
  await mineBlocks(3);
  await printUserInfo(vault, "Alice", alice.address);
  await printUserInfo(vault, "Bob", bob.address);

  // 9. Bob tente de retirer (devrait encore échouer)
  printSeparator("❌ BOB TENTE DE RETIRER (TROP TÔT)");
  
  console.log("\n🚨 Bob essaie de retirer 0.5 ETH...");
  
  try {
    await vault.connect(bob).withdraw(ethers.parseEther("0.5"));
    console.log("   ⚠️  ERREUR: Le retrait aurait dû échouer!");
  } catch (error: any) {
    console.log("   ✅ Retrait bloqué comme prévu!");
    console.log(`   💬 Raison: Encore ${await vault.unlockBlock(bob.address) - BigInt(await ethers.provider.getBlockNumber())} bloc(s) à attendre`);
  }

  // 10. On mine 3 blocs supplémentaires (Alice sera déverrouillée, Bob aussi)
  printSeparator("⛏️  MINING 3 BLOCS SUPPLÉMENTAIRES");
  
  await mineBlocks(3);
  await printUserInfo(vault, "Alice", alice.address);
  await printUserInfo(vault, "Bob", bob.address);

  // 11. Alice retire 1.5 ETH (devrait réussir)
  printSeparator("✅ ALICE RETIRE 1.5 ETH");
  
  const aliceWithdrawAmount = ethers.parseEther("1.5");
  console.log(`\n📥 Alice retire ${ethers.formatEther(aliceWithdrawAmount)} ETH...`);
  
  const aliceWithdrawTx = await vault.connect(alice).withdraw(aliceWithdrawAmount);
  await aliceWithdrawTx.wait();
  
  console.log(`✅ Retrait réussi! Transaction: ${aliceWithdrawTx.hash}`);
  await printUserInfo(vault, "Alice", alice.address);

  // 12. Bob retire TOUT son solde (devrait réussir)
  printSeparator("✅ BOB RETIRE TOUT SON SOLDE");
  
  console.log("\n📥 Bob retire tous ses fonds...");
  
  const bobWithdrawAllTx = await vault.connect(bob).withdrawAll();
  await bobWithdrawAllTx.wait();
  
  console.log(`✅ Retrait total réussi! Transaction: ${bobWithdrawAllTx.hash}`);
  await printUserInfo(vault, "Bob", bob.address);

  // 13. Alice fait un nouveau dépôt (nouveau lock)
  printSeparator("💰 ALICE FAIT UN NOUVEAU DÉPÔT");
  
  const aliceSecondDeposit = ethers.parseEther("1.0");
  console.log(`\n📤 Alice dépose ${ethers.formatEther(aliceSecondDeposit)} ETH...`);
  
  const aliceSecondDepositTx = await vault.connect(alice).deposit({ 
    value: aliceSecondDeposit 
  });
  await aliceSecondDepositTx.wait();
  
  console.log(`✅ Dépôt réussi! Nouveau locktime activé.`);
  await printUserInfo(vault, "Alice", alice.address);

  // 14. Alice tente de retirer immédiatement (devrait échouer à nouveau)
  printSeparator("❌ ALICE TENTE DE RETIRER (NOUVEAU LOCK)");
  
  console.log("\n🚨 Alice essaie de retirer après son nouveau dépôt...");
  
  try {
    await vault.connect(alice).withdraw(ethers.parseEther("0.5"));
    console.log("   ⚠️  ERREUR: Le retrait aurait dû échouer!");
  } catch (error: any) {
    console.log("   ✅ Retrait bloqué comme prévu! Nouveau lock actif.");
    console.log(`   💬 Blocs restants: ${await vault.unlockBlock(alice.address) - BigInt(await ethers.provider.getBlockNumber())}`);
  }

  // 15. Résumé final
  printSeparator("📊 RÉSUMÉ FINAL");
  
  console.log("\n📈 État final du Vault:");
  console.log(`   💎 Solde total: ${ethers.formatEther(await vault.getContractBalance())} ETH`);
  
  await printUserInfo(vault, "Alice", alice.address);
  await printUserInfo(vault, "Bob", bob.address);

  // 16. Vérification des soldes ETH finaux
  printSeparator("💵 SOLDES ETH FINAUX");
  
  const aliceFinalEth = await ethers.provider.getBalance(alice.address);
  const bobFinalEth = await ethers.provider.getBalance(bob.address);
  
  console.log(`\n   Alice:`);
  console.log(`      Initial: ${ethers.formatEther(aliceInitialEth)} ETH`);
  console.log(`      Final: ${ethers.formatEther(aliceFinalEth)} ETH`);
  console.log(`      Différence: ${ethers.formatEther(aliceFinalEth - aliceInitialEth)} ETH`);
  
  console.log(`\n   Bob:`);
  console.log(`      Initial: ${ethers.formatEther(bobInitialEth)} ETH`);
  console.log(`      Final: ${ethers.formatEther(bobFinalEth)} ETH`);
  console.log(`      Différence: ${ethers.formatEther(bobFinalEth - bobInitialEth)} ETH`);

  // 17. Test du propriétaire
  printSeparator("🔧 TEST DES FONCTIONS PROPRIÉTAIRE");
  
  console.log("\n⚙️  Le propriétaire change la durée de lock à 10 blocs...");
  const setLockTx = await vault.connect(deployer).setLockDuration(10);
  await setLockTx.wait();
  console.log(`✅ Durée de lock mise à jour: ${await vault.lockDuration()} blocs`);
  
  console.log("\n🚨 Bob essaie de changer la durée de lock (devrait échouer)...");
  try {
    await vault.connect(bob).setLockDuration(1);
    console.log("   ⚠️  ERREUR: Cela aurait dû échouer!");
  } catch (error: any) {
    console.log("   ✅ Accès refusé comme prévu! Seul le propriétaire peut faire ça.");
  }

  printSeparator("🎉 SCÉNARIO TERMINÉ AVEC SUCCÈS");
  
  console.log("\n✨ Tous les tests ont fonctionné comme prévu!");
  console.log("📚 Concepts démontrés:");
  console.log("   ✅ Dépôts multiples");
  console.log("   ✅ Système de lock temporel");
  console.log("   ✅ Retraits partiels et totaux");
  console.log("   ✅ Renouvellement du lock après nouveau dépôt");
  console.log("   ✅ Gestion des permissions (owner)");
  console.log("   ✅ Isolation des soldes entre utilisateurs");
  console.log("\n");
}

// Exécution du script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERREUR:", error);
    process.exit(1);
  });