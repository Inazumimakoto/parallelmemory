import type { Card, DifficultyId, Rank, Suit } from "./types";

export const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
export const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K"
];

export const suitGlyph: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣"
};

export const suitColor: Record<Suit, "red" | "black"> = {
  spades: "black",
  hearts: "red",
  diamonds: "red",
  clubs: "black"
};

export type DifficultyConfig = {
  id: DifficultyId;
  label: string;
  detail: string;
  columns: number;
  ranks: Rank[];
  mode: "paired" | "standard";
};

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: "easy",
    label: "Easy",
    detail: "3×4",
    columns: 3,
    ranks: ["A", "2", "3", "4", "5", "6"],
    mode: "paired"
  },
  {
    id: "normal",
    label: "Normal",
    detail: "4×4",
    columns: 4,
    ranks: ["A", "2", "3", "4", "5", "6", "7", "8"],
    mode: "paired"
  },
  {
    id: "hard",
    label: "Hard",
    detail: "Trump",
    columns: 13,
    ranks: RANKS,
    mode: "standard"
  }
];

export function getDifficultyConfig(id: DifficultyId): DifficultyConfig {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DIFFICULTIES[2];
}

export function createDeck(boardId: number, difficultyId: DifficultyId = "hard"): Card[] {
  const difficulty = getDifficultyConfig(difficultyId);

  if (difficulty.mode === "paired") {
    return difficulty.ranks.flatMap((rank, rankIndex) =>
      (["spades", "hearts"] as Suit[]).map((suit, suitIndex) => ({
        id: `b${boardId}-${difficulty.id}-${suit}-${rank}`,
        suit,
        rank,
        matchKey: rank,
        order: rankIndex * 2 + suitIndex
      }))
    );
  }

  return SUITS.flatMap((suit, suitIndex) =>
    RANKS.map((rank, rankIndex) => ({
      id: `b${boardId}-${suit}-${rank}`,
      suit,
      rank,
      matchKey: rank,
      order: suitIndex * RANKS.length + rankIndex
    }))
  );
}

export function makeRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeck(cards: Card[], seed: number): Card[] {
  const next = [...cards];
  const random = makeRandom(seed);

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}
