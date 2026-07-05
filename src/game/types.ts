export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  order: number;
  matchKey: string;
};

export type DifficultyId = "easy" | "normal" | "hard";

export type BoardState = {
  id: number;
  columns: number;
  difficulty: DifficultyId;
  cards: Card[];
  revealedIds: string[];
  pendingId: string | null;
  matchedIds: string[];
  mismatchIds: string[];
};

export type GameState = {
  boards: BoardState[];
  parallelCount: number;
  difficulty: DifficultyId;
  activeBoardIndex: number;
  moves: number;
  matches: number;
  seed: number;
  startedAt: number | null;
  finishedAt: number | null;
  lockUntil: number;
};
