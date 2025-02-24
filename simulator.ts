import { GAME_SETTINGS } from "./connection/gsConstants"

function generateReels(len: number, val: number): number[] {
    return Array.from({ length: len }, () => Math.floor(Math.random() * val));
}

function checkForThree(reels: number[], [v0, v1, v2]: number[]): any | null {
    if (reels[v0] === reels[v1] && reels[v1] === reels[v2]) {
        return { cmbIdx: [v0, v1, v2], cmbNm: "Comb3", cmbVal: reels[v0] };
    }
    return null;
}

function checkForFour(reels: number[], [v0, v1, v2, v3]: number[]): any | null {
    if (reels[v0] === reels[v1] && reels[v1] === reels[v2] && reels[v2] === reels[v3]) {
        return { cmbIdx: [v0, v1, v2, v3], cmbNm: "Comb4", cmbVal: reels[v0] };
    }
    return null;
}

function checkForFive(reels: number[], [v0, v1, v2, v3, v4]: number[]): any | null {
    if (reels[v0] === reels[v1] && reels[v1] === reels[v2] && reels[v2] === reels[v3] && reels[v3] === reels[v4]) {
        return { cmbIdx: [v0, v1, v2, v3, v4], cmbNm: "Comb5", cmbVal: reels[v0] };
    }
    return null;
}

function calculatePayout(winCombo: any, betAmt: number): number {
    // @ts-ignore
    const symbolName = GAME_SETTINGS.payNames[winCombo.cmbVal];
    // @ts-ignore
    const payout = GAME_SETTINGS.payouts[symbolName];

    if (!payout) {
        console.error(`Payout not found for symbol: ${symbolName}`);
        return 0;
    }

    switch (winCombo.cmbIdx.length) {
        case 3:
            return betAmt * (payout.THREE || 0);
        case 4:
            return betAmt * (payout.FOUR || 0);
        case 5:
            return betAmt * (payout.FIVE || 0);
        default:
            console.warn(`Unexpected match length: ${winCombo.cmbIdx.length}`);
            return 0;
    }
}

function runRTPSimulation(spins: number, betAmount: number) {
    let totalBets = 0;
    let totalWins = 0;

    for (let i = 0; i < spins; i++) {
        let reels = generateReels(15, 7);
        let winAmount = 0;
        let matchedIndices = new Set<number>();

        GAME_SETTINGS.winningCombinations5Match.forEach((combo) => {
            let win = checkForFive(reels, combo);
            if (win) {
                winAmount += calculatePayout(win, betAmount);
                combo.forEach((i) => matchedIndices.add(i));
            }
        });

        GAME_SETTINGS.winningCombinations4Match.forEach((combo) => {
            if (!combo.every((i) => matchedIndices.has(i))) {
                let win = checkForFour(reels, combo);
                if (win) {
                    winAmount += calculatePayout(win, betAmount);
                    combo.forEach((i) => matchedIndices.add(i));
                }
            }
        });

        GAME_SETTINGS.winningCombinations3Match.forEach((combo) => {
            if (!combo.every((i) => matchedIndices.has(i))) {
                let win = checkForThree(reels, combo);
                if (win) {
                    winAmount += calculatePayout(win, betAmount);
                }
            }
        });

        totalBets += betAmount;
        totalWins += winAmount;
    }

    let RTP = (totalWins / totalBets) * 100;
    console.log(`Total Spins: ${spins}`);
    console.log(`Total Bets: ${totalBets}`);
    console.log(`Total Wins: ${totalWins}`);
    console.log(`RTP: ${RTP.toFixed(2)}%`);
}

// Run simulation with 1,000,000 spins and a bet amount of 10
runRTPSimulation(100000, 10);
