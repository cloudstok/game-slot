// @ts-nocheck
import type { IWinCombos } from "../interfaces/userObj";
import { GS } from "./gsConstants";

export abstract class SlotUtility {
  static checkForThree(
    reels: number[],
    [v0, v1, v2]: number[]
  ): IWinCombos | null {
    if (reels[v0] === reels[v1] && reels[v1] === reels[v2]) {
      let object: IWinCombos = {
        cmbIdx: [v0, v1, v2],
        cmbNm: "Comb3",
        cmbVal: [reels[v0], reels[v1], reels[v2]],
      };

      return object;
    }
    return null;
  }

  static checkForFour(
    reels: number[],
    [v0, v1, v2, v3]: number[]
  ): IWinCombos | null {
    if (
      reels[v0] === reels[v1] &&
      reels[v1] === reels[v2] &&
      reels[v2] === reels[v3]
    ) {
      return {
        cmbIdx: [v0, v1, v2, v3],
        cmbNm: "Comb4",
        cmbVal: [reels[v0], reels[v1], reels[v2], reels[v3]],
      };
    }
    return null;
  }

  static checkForFive(
    reels: number[],
    [v0, v1, v2, v3, v4]: number[]
  ): IWinCombos | null {
    if (
      reels[v0] === reels[v1] &&
      reels[v1] === reels[v2] &&
      reels[v2] === reels[v3] &&
      reels[v3] === reels[v4]
    ) {
      let data: IWinCombos = {
        cmbIdx: [v0, v1, v2, v3, v4],
        cmbNm: "Comb5",
        cmbVal: [reels[v0], reels[v1], reels[v2], reels[v3], reels[v4]],
      };

      return data;
    }
    return null;
  }

  // @ts-ignore
  static calculatePayout(winCombo: IWinCombos, betAmt: number): number | any {


    const payout: number = GS.payouts[GS.payNames[winCombo.cmbVal[0]]];

    switch (winCombo.cmbIdx.length) {
      case 3:
        winCombo.cmbPyt = betAmt * payout.THREE;
        winCombo.cmbMtp = payout.THREE;
        winCombo.payline = SlotUtility.getPayLineIndex(winCombo);
        break;
      case 4:
        winCombo.cmbPyt = betAmt * payout.FOUR;
        winCombo.cmbMtp = payout.FOUR;
        winCombo.payline = SlotUtility.getPayLineIndex(winCombo);
        break;
      case 5:
        winCombo.cmbPyt = betAmt * payout.FIVE;
        winCombo.cmbMtp = payout.FIVE;
        winCombo.payline = SlotUtility.getPayLineIndex(winCombo);
        break;

      default:
        break;
    }

    return winCombo.cmbPyt;
  }

  static getPayLineIndex(winCombo: IWinCombos): number {
    let arr = Object.entries(GS.paylinesIndex);
    for (let [index, payLine] of arr) {
      let count = 0;

      winCombo.cmbIdx.forEach((idx) => {
        if (payLine.includes(idx)) count++;
      });

      switch (winCombo.cmbIdx.length) {
        case 5:
          if (count > 4) return Number(index);
          break;
        case 4:
          if (count > 3) return Number(index);
          break;
        case 3:
          if (count > 2) return Number(index);
          break;
      }
    }

    return -1;
  }

  static generateReels(len: number, val: number): number[] {
    return Array.from({ length: len }, () => Math.floor(Math.random() * val));
  }

  static transformReels(reel: number[]): number[] {
    let transformedReel: number = new Array(5);
    let x = [reel.slice(0, 5), reel.slice(5, 10), reel.slice(10, 15)];

    for (let i = 0; i < 5; i++) {
      if ([1, 2, 3].includes(i)) transformedReel[i] = x[i - 1];
      else if (i === 0 || i === 4) {
        let e = this.generateReels(5, 7);
        transformedReel[i] = e;
      }
    }

    return transformedReel;
  }
}
