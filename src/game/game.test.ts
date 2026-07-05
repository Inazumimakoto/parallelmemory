import { describe, expect, it } from "vitest";
import { createDeck } from "./deck";
import {
  canFlipCard,
  createGame,
  flipCard,
  getBoardTotalMatches,
  settleMismatches
} from "./game";

describe("parallel memory game logic", () => {
  it("creates one standard 52-card deck per board", () => {
    const deck = createDeck(1);

    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((card) => `${card.rank}-${card.suit}`)).size).toBe(
      52
    );
  });

  it("creates smaller easy and normal difficulty boards", () => {
    const easy = createGame(2, 123, "easy");
    const normal = createGame(2, 123, "normal");
    const hard = createGame(2, 123, "hard");

    expect(easy.boards[0].cards).toHaveLength(12);
    expect(easy.boards[0].columns).toBe(3);
    expect(getBoardTotalMatches(easy.boards[0])).toBe(6);

    expect(normal.boards[0].cards).toHaveLength(16);
    expect(normal.boards[0].columns).toBe(4);
    expect(getBoardTotalMatches(normal.boards[0])).toBe(8);

    expect(hard.boards[0].cards).toHaveLength(52);
    expect(hard.boards[0].columns).toBe(13);
    expect(getBoardTotalMatches(hard.boards[0])).toBe(26);
  });

  it("keeps the active board after the first flip of a turn", () => {
    const game = createGame(3, 123);
    const first = game.boards[0].cards[0].id;

    const afterFirst = flipCard(game, 0, first, 1000);

    expect(afterFirst.activeBoardIndex).toBe(0);
    expect(afterFirst.boards[0].pendingId).toBe(first);
    expect(canFlipCard(afterFirst, 1, game.boards[1].cards[0].id, 1200)).toBe(
      false
    );
  });

  it("blocks cards outside the active board", () => {
    const game = createGame(2, 123);
    const inactiveCard = game.boards[1].cards[0].id;

    expect(canFlipCard(game, 1, inactiveCard, 1000)).toBe(false);
    expect(flipCard(game, 1, inactiveCard, 1000)).toBe(game);
  });

  it("matches cards by rank within the same board", () => {
    const game = createGame(3, 123);
    const board = game.boards[0];
    const first = board.cards[0];
    const second = board.cards.find(
      (card) => card.rank === first.rank && card.id !== first.id
    );

    expect(second).toBeDefined();

    const afterFirst = flipCard(game, 0, first.id, 1000);
    const afterSecond = flipCard(afterFirst, 0, second!.id, 1200);

    expect(afterSecond.matches).toBe(1);
    expect(afterSecond.boards[0].matchedIds).toEqual(
      expect.arrayContaining([first.id, second!.id])
    );
    expect(afterSecond.boards[0].pendingId).toBeNull();
    expect(afterSecond.activeBoardIndex).toBe(0);
  });

  it("moves to the next unfinished board when the current board is complete", () => {
    const game = createGame(2, 123, "easy");
    const board = game.boards[0];
    const first = board.cards[0];
    const second = board.cards.find(
      (card) => card.matchKey === first.matchKey && card.id !== first.id
    );

    expect(second).toBeDefined();

    const alreadyMatchedIds = board.cards
      .filter((card) => card.id !== first.id && card.id !== second!.id)
      .map((card) => card.id);
    const almostComplete = {
      ...game,
      matches: alreadyMatchedIds.length / 2,
      boards: game.boards.map((currentBoard, index) =>
        index === 0
          ? {
              ...currentBoard,
              matchedIds: alreadyMatchedIds
            }
          : currentBoard
      )
    };

    const afterFirst = flipCard(almostComplete, 0, first.id, 1000);
    const afterSecond = flipCard(afterFirst, 0, second!.id, 1200);

    expect(afterSecond.boards[0].matchedIds).toHaveLength(board.cards.length);
    expect(afterSecond.activeBoardIndex).toBe(1);
    expect(afterSecond.finishedAt).toBeNull();
  });

  it("temporarily reveals misses and then settles them face down", () => {
    const game = createGame(1, 123);
    const board = game.boards[0];
    const first = board.cards[0];
    const second = board.cards.find((card) => card.rank !== first.rank);

    expect(second).toBeDefined();

    const afterFirst = flipCard(game, 0, first.id, 1000);
    const missed = flipCard(afterFirst, 0, second!.id, 1100);

    expect(missed.boards[0].mismatchIds).toEqual(
      expect.arrayContaining([first.id, second!.id])
    );
    expect(missed.activeBoardIndex).toBe(0);
    expect(canFlipCard(missed, 0, board.cards[2].id, 1200)).toBe(false);

    const settled = settleMismatches(missed, missed.lockUntil + 1);

    expect(settled.boards[0].mismatchIds).toEqual([]);
    expect(settled.lockUntil).toBe(0);
    expect(settled.activeBoardIndex).toBe(0);
  });

  it("moves to the next board after a miss is shown", () => {
    const game = createGame(2, 123);
    const board = game.boards[0];
    const first = board.cards[0];
    const second = board.cards.find((card) => card.rank !== first.rank);

    expect(second).toBeDefined();

    const afterFirst = flipCard(game, 0, first.id, 1000);
    const missed = flipCard(afterFirst, 0, second!.id, 1200);

    expect(missed.activeBoardIndex).toBe(0);

    const settled = settleMismatches(missed, missed.lockUntil + 1);

    expect(settled.activeBoardIndex).toBe(1);
  });
});
