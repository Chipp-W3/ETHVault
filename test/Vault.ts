import { expect } from "chai";
import { ethers } from "hardhat";
import { Vault } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault - Coffre-fort décentralisé", function () {
  let vault: Vault;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  const LOCK_DURATION = 10; // 10 blocs

  beforeEach(async function () {
    // Récupération des signataires
    [owner, user1, user2] = await ethers.getSigners();

    // Déploiement du contrat
    const VaultFactory = await ethers.getContractFactory("Vault");
    vault = await VaultFactory.deploy(LOCK_DURATION);
    await vault.waitForDeployment();
  });

  describe("Déploiement", function () {
    it("Devrait définir le bon propriétaire", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Devrait définir la bonne durée de verrouillage", async function () {
      expect(await vault.lockDuration()).to.equal(LOCK_DURATION);
    });

    it("Devrait avoir un solde initial de 0", async function () {
      expect(await vault.getContractBalance()).to.equal(0);
    });
  });

  describe("Dépôts", function () {
    it("Devrait permettre un dépôt d'ETH", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      await expect(vault.connect(user1).deposit({ value: depositAmount }))
        .to.changeEtherBalances(
          [user1, vault],
          [-depositAmount, depositAmount]
        );
    });

    it("Devrait mettre à jour le solde de l'utilisateur après un dépôt", async function () {
      const depositAmount = ethers.parseEther("2.5");
      
      await vault.connect(user1).deposit({ value: depositAmount });
      
      expect(await vault.balances(user1.address)).to.equal(depositAmount);
    });

    it("Devrait émettre un event Deposit", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      await expect(vault.connect(user1).deposit({ value: depositAmount }))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, depositAmount, depositAmount);
    });

    it("Devrait définir le bloc de déverrouillage correctement", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const blockBefore = await ethers.provider.getBlockNumber();
      
      await vault.connect(user1).deposit({ value: depositAmount });
      
      const unlockBlock = await vault.unlockBlock(user1.address);
      expect(unlockBlock).to.equal(blockBefore + 1 + LOCK_DURATION);
    });

    it("Devrait rejeter un dépôt de 0 ETH", async function () {
      await expect(vault.connect(user1).deposit({ value: 0 }))
        .to.be.revertedWith("Le montant doit etre superieur a 0");
    });

    it("Devrait permettre plusieurs dépôts et cumuler les soldes", async function () {
      const firstDeposit = ethers.parseEther("1.0");
      const secondDeposit = ethers.parseEther("2.0");
      
      await vault.connect(user1).deposit({ value: firstDeposit });
      await vault.connect(user1).deposit({ value: secondDeposit });
      
      expect(await vault.balances(user1.address)).to.equal(firstDeposit + secondDeposit);
    });

    it("Devrait permettre à plusieurs utilisateurs de déposer", async function () {
      const amount1 = ethers.parseEther("1.0");
      const amount2 = ethers.parseEther("2.0");
      
      await vault.connect(user1).deposit({ value: amount1 });
      await vault.connect(user2).deposit({ value: amount2 });
      
      expect(await vault.balances(user1.address)).to.equal(amount1);
      expect(await vault.balances(user2.address)).to.equal(amount2);
    });
  });

  describe("Retraits", function () {
    beforeEach(async function () {
      // Dépôt initial pour les tests
      await vault.connect(user1).deposit({ value: ethers.parseEther("5.0") });
    });

    it("Devrait rejeter un retrait si les fonds sont encore verrouillés", async function () {
      const withdrawAmount = ethers.parseEther("1.0");
      
      await expect(vault.connect(user1).withdraw(withdrawAmount))
        .to.be.revertedWith("Fonds encore verrouilles");
    });

    it("Devrait permettre un retrait après déverrouillage", async function () {
      const withdrawAmount = ethers.parseEther("1.0");
      
      // Mine des blocs pour dépasser la période de verrouillage
      for (let i = 0; i < LOCK_DURATION; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await expect(vault.connect(user1).withdraw(withdrawAmount))
        .to.changeEtherBalances(
          [vault, user1],
          [-withdrawAmount, withdrawAmount]
        );
    });

    it("Devrait mettre à jour le solde après un retrait", async function () {
      const withdrawAmount = ethers.parseEther("2.0");
      const initialBalance = await vault.balances(user1.address);
      
      // Mine des blocs
      for (let i = 0; i < LOCK_DURATION; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await vault.connect(user1).withdraw(withdrawAmount);
      
      expect(await vault.balances(user1.address)).to.equal(initialBalance - withdrawAmount);
    });

    it("Devrait émettre un event Withdrawal", async function () {
      const withdrawAmount = ethers.parseEther("1.0");
      const initialBalance = await vault.balances(user1.address);
      
      // Mine des blocs
      for (let i = 0; i < LOCK_DURATION; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await expect(vault.connect(user1).withdraw(withdrawAmount))
        .to.emit(vault, "Withdrawal")
        .withArgs(user1.address, withdrawAmount, initialBalance - withdrawAmount);
    });

    it("Devrait rejeter un retrait supérieur au solde", async function () {
      const withdrawAmount = ethers.parseEther("10.0");
      
      // Mine des blocs
      for (let i = 0; i < LOCK_DURATION; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await expect(vault.connect(user1).withdraw(withdrawAmount))
        .to.be.revertedWith("Solde insuffisant");
    });

    it("Devrait rejeter un retrait de 0 ETH", async function () {
      // Mine des blocs
      for (let i = 0; i < LOCK_DURATION; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await expect(vault.connect(user1).withdraw(0))
        .to.be.revertedWith("Le montant doit etre superieur a 0");
    });
  });

  describe("Retrait total", function () {
    beforeEach(async function () {
      await vault.connect(user1).deposit({ value: ethers.parseEther("3.0") });
    });

    it("Devrait permettre de retirer tous les fonds après déverrouillage", async function () {
      const balance = await vault.balances(user1.address);
      
      // Mine des blocs
      for (let i = 0; i < LOCK_DURATION; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await expect(vault.connect(user1).withdrawAll())
        .to.changeEtherBalances(
          [vault, user1],
          [-balance, balance]
        );
      
      expect(await vault.balances(user1.address)).to.equal(0);
    });

    it("Devrait rejeter withdrawAll si aucun fond n'est disponible", async function () {
      await expect(vault.connect(user2).withdrawAll())
        .to.be.revertedWith("Aucun fonds a retirer");
    });
  });

  describe("Fonctions de visualisation", function () {
    it("Devrait retourner le bon solde pour un utilisateur", async function () {
      const depositAmount = ethers.parseEther("1.5");
      await vault.connect(user1).deposit({ value: depositAmount });
      
      expect(await vault.getBalance(user1.address)).to.equal(depositAmount);
    });

    it("Devrait retourner le bon bloc de déverrouillage", async function () {
      const blockBefore = await ethers.provider.getBlockNumber();
      await vault.connect(user1).deposit({ value: ethers.parseEther("1.0") });
      
      expect(await vault.getUnlockBlock(user1.address))
        .to.equal(blockBefore + 1 + LOCK_DURATION);
    });

    it("Devrait indiquer si les fonds sont déverrouillés", async function () {
      await vault.connect(user1).deposit({ value: ethers.parseEther("1.0") });
      
      expect(await vault.isUnlocked(user1.address)).to.be.false;
      
      // Mine des blocs
      for (let i = 0; i < LOCK_DURATION; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      expect(await vault.isUnlocked(user1.address)).to.be.true;
    });

    it("Devrait retourner le solde total du contrat", async function () {
      await vault.connect(user1).deposit({ value: ethers.parseEther("1.0") });
      await vault.connect(user2).deposit({ value: ethers.parseEther("2.0") });
      
      expect(await vault.getContractBalance()).to.equal(ethers.parseEther("3.0"));
    });
  });

  describe("Modification de la durée de verrouillage", function () {
    it("Devrait permettre au propriétaire de modifier la durée", async function () {
      const newDuration = 20;
      
      await vault.connect(owner).setLockDuration(newDuration);
      
      expect(await vault.lockDuration()).to.equal(newDuration);
    });

    it("Devrait émettre un event lors de la modification", async function () {
      const newDuration = 15;
      
      await expect(vault.connect(owner).setLockDuration(newDuration))
        .to.emit(vault, "LockDurationUpdated")
        .withArgs(LOCK_DURATION, newDuration);
    });

    it("Devrait rejeter si appelé par un non-propriétaire", async function () {
      await expect(vault.connect(user1).setLockDuration(20))
        .to.be.revertedWith("Seul le proprietaire peut appeler cette fonction");
    });
  });

  describe("Scénarios complexes", function () {
    it("Devrait gérer plusieurs dépôts et retraits partiels", async function () {
      // Premier dépôt
      await vault.connect(user1).deposit({ value: ethers.parseEther("5.0") });
      
      // Mine des blocs
      for (let i = 0; i < LOCK_DURATION; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Retrait partiel
      await vault.connect(user1).withdraw(ethers.parseEther("2.0"));
      
      expect(await vault.balances(user1.address)).to.equal(ethers.parseEther("3.0"));
      
      // Second dépôt (nouveau verrouillage)
      await vault.connect(user1).deposit({ value: ethers.parseEther("1.0") });
      
      expect(await vault.balances(user1.address)).to.equal(ethers.parseEther("4.0"));
    });

    it("Devrait isoler les soldes entre utilisateurs", async function () {
      await vault.connect(user1).deposit({ value: ethers.parseEther("3.0") });
      await vault.connect(user2).deposit({ value: ethers.parseEther("2.0") });
      
      // Mine des blocs
      for (let i = 0; i < LOCK_DURATION; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await vault.connect(user1).withdraw(ethers.parseEther("1.0"));
      
      expect(await vault.balances(user1.address)).to.equal(ethers.parseEther("2.0"));
      expect(await vault.balances(user2.address)).to.equal(ethers.parseEther("2.0"));
    });
  });
});