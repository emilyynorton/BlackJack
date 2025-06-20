class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.playerScore = 0;
        this.dealerScore = 0;
        this.currentWager = 0;
        this.coins = {
            quarters: 10,
            dimes: 10,
            nickels: 10
        };
        this.dealerReveal = false;
        this.initializeGame();
    }

    initializeGame() {
        this.createDeck();
        this.setupEventListeners();
        this.updateTotalMoney();
    }

    createDeck() {
        try {
            const suits = ['♠', '♥', '♦', '♣'];
            const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            
            this.deck = [];
            for (let suit of suits) {
                for (let value of values) {
                    const points = value === 'A' ? 11 : value === 'J' || value === 'Q' || value === 'K' ? 10 : parseInt(value);
                    if (isNaN(points)) {
                        throw new Error(`Invalid points calculation for card ${value} of ${suit}`);
                    }
                    this.deck.push({
                        suit,
                        value,
                        points
                    });
                }
            }
            
            this.shuffleDeck();
            
        } catch (error) {
            console.error('Deck creation error:', error);
            this.endGame('Error creating deck. Please refresh the page.');
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    setupEventListeners() {
        try {
            const placeWager = document.getElementById('placeWager');
            const hitButton = document.getElementById('hitButton');
            const stayButton = document.getElementById('stayButton');
            const newGameButton = document.getElementById('newGameButton');

            if (!placeWager || !hitButton || !stayButton || !newGameButton) {
                throw new Error('Missing required game elements');
            }

            placeWager.addEventListener('click', () => this.placeWager());
            hitButton.addEventListener('click', () => this.hit());
            stayButton.addEventListener('click', () => this.stay());
            newGameButton.addEventListener('click', () => this.newGame());
        } catch (error) {
            console.error('Event listener setup error:', error);
            this.endGame('Error setting up game controls. Please refresh the page.');
        }
    }

    placeWager() {
        const wagerAmount = parseFloat(document.getElementById('wagerAmount').value);
        if (!wagerAmount || wagerAmount <= 0) {
            alert('Please enter a valid wager amount');
            return;
        }

        // Get current total money
        const totalMoney = parseFloat(document.getElementById('totalMoney').textContent);
        if (wagerAmount > totalMoney) {
            alert('Invalid wager: Amount exceeds total money available');
            return;
        }

        // Find a valid combination of coins that won't go negative
        let isValidWager = false;
        let bestCombination = null;
        
        // Try different combinations of coins, prioritizing quarters first
        // Start with maximum quarters and reduce until we find a valid combination
        for (let q = this.coins.quarters; q >= 0; q--) {
            const remainingAfterQuarters = (wagerAmount - (q * 0.25)).toFixed(2);
            
            // Try with maximum dimes next
            for (let d = Math.min(Math.floor(remainingAfterQuarters / 0.10), this.coins.dimes); d >= 0; d--) {
                const remainingAfterDimes = (remainingAfterQuarters - (d * 0.10)).toFixed(2);
                
                // Calculate remaining nickels needed
                const n = Math.floor(remainingAfterDimes / 0.05);
                if (n <= this.coins.nickels && (n * 0.05).toFixed(2) === remainingAfterDimes) {
                    // Found a valid combination
                    isValidWager = true;
                    bestCombination = { quarters: q, dimes: d, nickels: n };
                    break;
                }
            }
            if (isValidWager) break;
        }

        if (!isValidWager) {
            alert('Invalid wager: Cannot make this amount with available coins');
            return;
        }

        // Deduct coins using the best combination
        this.coins.quarters -= bestCombination.quarters;
        this.coins.dimes -= bestCombination.dimes;
        this.coins.nickels -= bestCombination.nickels;
        this.currentWager = wagerAmount;
        this.updateTotalMoney();

        // Remove placeholders and show real cards
        const dealerPlaceholders = document.querySelector('.dealer-area .card-placeholder-container');
        const playerPlaceholders = document.querySelector('.player-area .card-placeholder-container');
        dealerPlaceholders.style.display = 'none';
        playerPlaceholders.style.display = 'none';

        // Start game
        this.startGame();
    }

    async startGame() {
        this.playerHand = [];
        this.dealerHand = [];
        this.playerScore = 0;
        this.dealerScore = 0;

        // Deal initial cards
        // Dealer gets two cards, but we'll only show one initially
        const hiddenCard = this.deck.pop();
        const visibleCard = this.deck.pop();
        this.dealerHand.push(hiddenCard);
        this.dealerHand.push(visibleCard);
        // this.dealerHand = [
            // { suit: '♠', value: 'A', points: 11 },
            // { suit: '♦', value: 'J', points: 10 }
        // ];
        
        // Player gets two cards
        this.playerHand.push(this.deck.pop());
        this.playerHand.push(this.deck.pop());
        // this.playerHand = [
            // { suit: '♠', value: 'A', points: 11 },
            // { suit: '♦', value: 'J', points: 10 }
        // ];

        // Calculate initial scores
        this.calculateScores();

        // Check for dealer Blackjack
        if (this.dealerScore === 21 && this.dealerHand.length === 2) {
            this.dealerReveal = true;
            this.revealDealerCard();
            
            // Check if both have Blackjack
            if (this.playerScore === 21 && this.playerHand.length === 2) {
                
                const message = 'Both have Blackjack! Push!';
                document.getElementById('gameStatus').textContent = message;
                this.updateDisplay();
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.awardWinnings(1);
                await this.showMoneyUpdate();
                await this.endGame(message);
                return;
            }
                       
            const message = 'Dealer has Blackjack! You lose!';
            document.getElementById('gameStatus').textContent = message;
            this.updateDisplay();
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.awardWinnings(0);
            await this.showMoneyUpdate();
            await this.endGame(message);
            return;
        }

        // Check for player Blackjack
        if (this.playerScore === 21 && this.playerHand.length === 2) {
            const message = 'Blackjack! You win!';
            document.getElementById('gameStatus').textContent = message;
            this.updateDisplay();
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.awardWinnings(2.5);
            await this.showMoneyUpdate();
            await this.endGame(message);
            return;
        }

        this.updateDisplay();

    }

    hit() {
        if (this.currentWager === 0) return;
        this.playerHand.push(this.deck.pop());
        this.calculateScores();
        this.updateDisplay();

        if (this.playerScore > 21) {
            this.endGame('Bust! Dealer wins!');
            this.awardWinnings(0);
        }
    }

    revealDealerCard() {
        // Update the first dealer card to show its actual value
        const dealerCards = document.getElementById('dealerCards');
        const firstCard = dealerCards.querySelector('.card');
        if (firstCard) {
            const overlay = firstCard.querySelector('.card-overlay');
            if (overlay) {
                // Remove the overlay immediately
                overlay.remove();
                
                // Update the dealer's score display to show the full score
                // const dealerScoreElement = document.getElementById('dealerScore');
                // dealerScoreElement.textContent = this.dealerScore;
            }
        }
    }

    async stay() {
        if (this.currentWager === 0) return;
        
        // Reveal dealer's hidden card
        this.dealerReveal = true;
        this.revealDealerCard();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Calculate scores after reveal
        this.calculateScores();
        console.log('Dealer score:', this.dealerScore);
        this.updateDisplay();

        // Dealer must hit if score is 16 or less
        while (this.dealerScore <= 16) {
           
            // Add a short delay before the dealer hits
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get the new card
            const newCard = this.deck.pop();
            this.dealerHand.push(newCard);
            this.calculateScores();
            this.updateDisplay();
            
            // Add a longer delay to show the new card
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Clear the status message
            // console.log('Dealer score:', this.dealerScore);
        }

        if (this.dealerScore > 21) {
            const message = 'Dealer busts, you win!';
            document.getElementById('gameStatus').textContent = message;
            await new Promise(resolve => setTimeout(resolve, 500));
            this.awardWinnings(2);
            await this.showMoneyUpdate();
            await this.endGame(message);
        } else {
            const result = this.determineWinner();
            document.getElementById('gameStatus').textContent = result.message;
            await new Promise(resolve => setTimeout(resolve, 500));
            this.awardWinnings(result.multiplier);
            await this.showMoneyUpdate();
            await this.endGame(result.message);
        }
    }

    calculateScores() {
        this.playerScore = this.calculateHandScore(this.playerHand);
        this.dealerScore = this.calculateHandScore(this.dealerHand);
    }

    calculateHandScore(hand) {
        let score = 0;
        let aces = 0;

        for (let card of hand) {
            score += card.points;
            if (card.value === 'A') aces++;
        }

        // Adjust for aces if score is too high
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }

        return score;
    }

    determineWinner() {
    
        // Compare scores
        if (this.playerScore === this.dealerScore) {
            return { message: 'Push! No winner.', multiplier: 1 };
        } else if (this.playerScore > this.dealerScore) {
            return { message: 'You win!', multiplier: 2 };
        } else {
            return { message: 'Dealer wins!', multiplier: 0 };
        }
    }

    awardWinnings(multiplier) {
        let winnings = 0;
        const wagerInCents = Math.floor(this.currentWager * 100);
        if (multiplier > 0) {
            winnings = Math.floor((this.currentWager * (multiplier-1)) * 100); // cents
            winnings += wagerInCents;
        }
    
        // Award coins
        while (winnings > 0) {
            // Try to use quarters first
            while (winnings >= 25) {
                this.coins.quarters++;
                winnings -= 25;
            }
            // Then dimes
            while (winnings >= 10) {
                this.coins.dimes++;
                winnings -= 10;
            }
            // Finally nickels
            while (winnings >= 5) {
                this.coins.nickels++;
                winnings -= 5;
            }
            // If we can't convert remaining amount, break
            if (winnings > 0) break;
        }
    
        this.updateTotalMoney();
        this.currentWager = 0;
    }

    updateDisplay() {
        this.calculateScores();
        this.updateCards();
        this.updateControls();
        
        // Force a reflow to ensure all DOM updates are applied
        document.body.offsetHeight;
    }

    updateCards() {
        const dealerCards = document.getElementById('dealerCards');
        const playerCards = document.getElementById('playerCards');
        const dealerPlaceholders = document.querySelector('.dealer-area .card-placeholder-container');
        const playerPlaceholders = document.querySelector('.player-area .card-placeholder-container');

        // Show placeholders while placing wager
        if (this.currentWager === 0) {
            dealerCards.style.display = 'none';
            playerCards.style.display = 'none';
            dealerPlaceholders.style.display = 'flex';
            playerPlaceholders.style.display = 'flex';
        } else {
            dealerCards.style.display = 'flex';
            playerCards.style.display = 'flex';
            dealerPlaceholders.style.display = 'none';
            playerPlaceholders.style.display = 'none';

            // Clear and add dealer cards
            dealerCards.innerHTML = '';
            this.dealerHand.forEach((card, index) => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card';
                cardElement.innerHTML = this.createCardElement(card);
                
                // Only add overlay to the first card if dealerReveal is false
                if (index === 0 && !this.dealerReveal) {
                    const overlay = document.createElement('div');
                    overlay.className = 'card-overlay';
                    cardElement.appendChild(overlay);
                }
                
                dealerCards.appendChild(cardElement);
            });

            // Clear and add player cards
            playerCards.innerHTML = '';
            this.playerHand.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card';
                cardElement.innerHTML = this.createCardElement(card);
                playerCards.appendChild(cardElement);
            });
        }
    }

    createCardElement(card) {
        const suit = card.suit;
        const colorClass = suit === '♥' || suit === '♦' ? 'red-card' : 'black-card';
        return `<div class="card ${colorClass}">
            ${card.value}<br>${card.suit}
        </div>`;
    }

    updateTotalMoney() {
        const total = (this.coins.quarters * 0.25 + this.coins.dimes * 0.10 + this.coins.nickels * 0.05).toFixed(2);
        document.getElementById('totalMoney').textContent = total;
        document.getElementById('quarters').textContent = this.coins.quarters;
        document.getElementById('dimes').textContent = this.coins.dimes;
        document.getElementById('nickels').textContent = this.coins.nickels;

        // Check if player is out of money
        if (total < 0) {
            this.endGame('Dealer wins, you are out of money!');
            // Reset game with initial values
            this.coins.quarters = 10;
            this.coins.dimes = 10;
            this.coins.nickels = 10;
            this.currentWager = 0;
            this.updateTotalMoney();
            this.initializeGame();
        }
    }

    updateControls() {
        const hitButton = document.getElementById('hitButton');
        const stayButton = document.getElementById('stayButton');
        const newGameButton = document.getElementById('newGameButton');

        hitButton.disabled = this.playerScore >= 21;
        stayButton.disabled = false;
        newGameButton.disabled = false;
    }

    async showMoneyUpdate() {
        // Force reflow to ensure DOM updates are applied
        document.body.offsetHeight;
        // Wait for money update to be visible
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    async endGame(message) {
        // Store the message element
        const statusElement = document.getElementById('gameStatus');
        statusElement.textContent = message;
        this.updateControls();
        
        // Update display to show current state
        this.updateDisplay();
        
        // Reset game after any win/loss condition
        if (message.includes('win') || message.includes('bust') || message.includes('lose') || message.includes('Dealer wins!')) {
            // Add a longer delay to ensure all updates are visible
            await new Promise(resolve => setTimeout(resolve, 2000)); // 3 second delay
            this.newGame();
            
            // Clear the message after the game is reset
            statusElement.textContent = '';
        }
    }

    newGame() {
        // Check if player has run out of money
        const totalMoney = parseFloat(document.getElementById('totalMoney').textContent);
        if (totalMoney <= 0) {
            // Show losing message and reset with fresh bankroll
            document.getElementById('gameStatus').textContent = 'You Lose! Game restarting with $4.00';
            this.coins.quarters = 10;
            this.coins.dimes = 10;
            this.coins.nickels = 10;
            this.currentWager = 0;
            this.updateTotalMoney();
            
            // Reset game state
            this.createDeck();
            this.resetGame();
            this.updateCards();
            this.updateScores();
            this.updateControls();
            return;
        }

        // Clear the game status message
        document.getElementById('gameStatus').textContent = '';
        
        this.createDeck();
        this.resetGame();
        this.updateCards();
        this.updateScores();
        this.updateControls();
    }

    resetGame() {
        // Reset game state
        this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.playerScore = 0;
        this.dealerScore = 0;
        this.currentWager = 0;
        
        // Reset the dealer reveal flag
        this.dealerReveal = false;
        
        // Clear the dealer's cards container
        const dealerCards = document.getElementById('dealerCards');
        if (dealerCards) {
            dealerCards.innerHTML = '';
        }
        
        this.updateCards();
        this.updateScores();
        this.updateControls();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BlackjackGame();
});
