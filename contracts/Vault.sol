// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Vault
 * @dev Coffre-fort décentralisé permettant aux utilisateurs de déposer et retirer de l'ETH
 * @notice Ce contrat implémente un système de coffre-fort avec verrouillage temporel
 */
contract Vault {
    // Mapping pour stocker les soldes de chaque utilisateur
    mapping(address => uint256) public balances;
    
    // Mapping pour stocker le bloc de déverrouillage pour chaque utilisateur
    mapping(address => uint256) public unlockBlock;
    
    // Nombre de blocs pendant lesquels les fonds sont verrouillés après un dépôt
    uint256 public lockDuration;
    
    // Events pour tracer les opérations
    event Deposit(address indexed user, uint256 amount, uint256 newBalance, string message);
    event Withdrawal(address indexed user, uint256 amount, uint256 remainingBalance);
    event LockDurationUpdated(uint256 oldDuration, uint256 newDuration);
    
    // Adresse du propriétaire du contrat
    address public owner;
    
    /**
     * @dev Constructeur du contrat
     * @param _lockDuration Nombre de blocs pendant lesquels les fonds sont verrouillés
     */
    constructor(uint256 _lockDuration) {
        owner = msg.sender;
        lockDuration = _lockDuration;
    }
    
    /**
     * @dev Modificateur pour restreindre l'accès au propriétaire
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Seul le proprietaire peut appeler cette fonction");
        _;
    }
    
    /**
     * @dev Permet à un utilisateur de déposer de l'ETH dans le coffre-fort
     * @notice Les fonds seront verrouillés pendant lockDuration blocs
     */
    function deposit() external payable {
        require(msg.value > 0, "Le montant doit etre superieur a 0");
        
        balances[msg.sender] += msg.value;
        unlockBlock[msg.sender] = block.number + lockDuration;
        
        emit Deposit(msg.sender, msg.value, balances[msg.sender], "HEELLLLLLLLLLLLLLLLO");
    }
    
    /**
     * @dev Permet à un utilisateur de retirer ses fonds
     * @param _amount Montant à retirer en wei
     */
    function withdraw(uint256 _amount) external {
        require(_amount > 0, "Le montant doit etre superieur a 0");
        require(balances[msg.sender] >= _amount, "Solde insuffisant");
        require(block.number >= unlockBlock[msg.sender], "Fonds encore verrouilles");
        
        balances[msg.sender] -= _amount;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Le transfert a echoue");
        
        emit Withdrawal(msg.sender, _amount, balances[msg.sender]);
    }
    
    /**
     * @dev Permet à un utilisateur de retirer tous ses fonds
     */
    function withdrawAll() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Aucun fonds a retirer");
        require(block.number >= unlockBlock[msg.sender], "Fonds encore verrouilles");
        
        balances[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Le transfert a echoue");
        
        emit Withdrawal(msg.sender, amount, 0);
    }
    
    /**
     * @dev Permet de consulter le solde d'un utilisateur
     * @param _user Adresse de l'utilisateur
     * @return Le solde de l'utilisateur en wei
     */
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }
    
    /**
     * @dev Permet de consulter le bloc de déverrouillage d'un utilisateur
     * @param _user Adresse de l'utilisateur
     * @return Le numéro de bloc à partir duquel les fonds peuvent être retirés
     */
    function getUnlockBlock(address _user) external view returns (uint256) {
        return unlockBlock[_user];
    }
    
    /**
     * @dev Permet de vérifier si les fonds d'un utilisateur sont déverrouillés
     * @param _user Adresse de l'utilisateur
     * @return true si les fonds sont déverrouillés, false sinon
     */
    function isUnlocked(address _user) external view returns (bool) {
        return block.number >= unlockBlock[_user];
    }
    
    /**
     * @dev Permet au propriétaire de modifier la durée de verrouillage
     * @param _newDuration Nouvelle durée de verrouillage en blocs
     */
    function setLockDuration(uint256 _newDuration) external onlyOwner {
        uint256 oldDuration = lockDuration;
        lockDuration = _newDuration;
        emit LockDurationUpdated(oldDuration, _newDuration);
    }
    
    /**
     * @dev Retourne le solde total du contrat
     * @return Le solde total en wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}