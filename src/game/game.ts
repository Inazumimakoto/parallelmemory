import { createDeck, getDifficultyConfig, shuffleDeck } from "./deck";
import type { BoardState, DifficultyId, GameState } from "./types";

export const MIN_PARALLEL_COUNT = 1;
export const MAX_PARALLEL_COUNT = 10;
export const MISMATCH_REVEAL_MS = 760;

export function clampParallelCount(count: number): number {
  return Math.min(MAX_PARALLEL_COUNT, Math.max(MIN_PARALLEL_COUNT, count));
}

export function createGame(
  parallelCount = 3,
  seed = Date.now(),
  difficulty: DifficultyId = "hard"
): GameState {
  const count = clampParallelCount(parallelCount);
  const boards = Array.from({ length: count }, (_, index) =>
    createBoard(index, seed, difficulty)
  );

  return {
    boards,
    parallelCount: count,
    difficulty,
    activeBoardIndex: 0,
    moves: 0,
    matches: 0,
    seed,
    startedAt: null,
    finishedAt: null,
    lockUntil: 0
  };
}

export function restartGame(state: GameState): GameState {
  return createGame(state.parallelCount, state.seed, state.difficulty);
}

export function createNewGame(
  parallelCount: number,
  difficulty: DifficultyId = "hard"
): GameState {
  return createGame(parallelCount, Date.now(), difficulty);
}

export function canFlipCard(
  state: GameState,
  boardIndex: number,
  cardId: string,
  now = Date.now()
): boolean {
  if (state.finishedAt !== null || now < state.lockUntil) {
    return false;
  }

  if (boardIndex !== state.activeBoardIndex) {
    return false;
  }

  const board = state.boards[boardIndex];
  if (!board) {
    return false;
  }

  return (
    !board.revealedIds.includes(cardId) &&
    !board.matchedIds.includes(cardId) &&
    !board.mismatchIds.includes(cardId)
  );
}

export function flipCard(
  state: GameState,
  boardIndex: number,
  cardId: string,
  now = Date.now()
): GameState {
  if (!canFlipCard(state, boardIndex, cardId, now)) {
    return state;
  }

  const activeBoard = state.boards[boardIndex];
  const card = activeBoard.cards.find((item) => item.id === cardId);
  if (!card) {
    return state;
  }

  const startedAt = state.startedAt ?? now;
  const baseState: GameState = {
    ...state,
    startedAt,
    moves: state.moves + 1,
    activeBoardIndex: boardIndex
  };

  if (activeBoard.pendingId === null) {
    return updateBoard(baseState, boardIndex, {
      pendingId: cardId,
      revealedIds: [cardId],
      mismatchIds: []
    });
  }

  const pendingCard = activeBoard.cards.find(
    (item) => item.id === activeBoard.pendingId
  );

  if (!pendingCard || pendingCard.id === card.id) {
    return baseState;
  }

  const isMatch = pendingCard.matchKey === card.matchKey;
  if (isMatch) {
    const updated = updateBoard(baseState, boardIndex, {
      pendingId: null,
      revealedIds: [],
      mismatchIds: [],
      matchedIds: [...activeBoard.matchedIds, pendingCard.id, card.id]
    });
    const next = {
      ...updated,
      matches: updated.matches + 1
    };

    if (areAllBoardsComplete(next)) {
      return {
        ...next,
        finishedAt: now
      };
    }

    return isBoardComplete(next.boards[boardIndex])
      ? {
          ...next,
          activeBoardIndex: getNextPlayableBoardIndex(next, boardIndex)
        }
      : next;
  }

  return updateBoard(
    {
      ...baseState,
      lockUntil: now + MISMATCH_REVEAL_MS
    },
    boardIndex,
    {
      pendingId: null,
      revealedIds: [],
      mismatchIds: [pendingCard.id, card.id]
    }
  );
}

export function settleMismatches(state: GameState, now = Date.now()): GameState {
  if (now < state.lockUntil) {
    return state;
  }

  if (!state.boards.some((board) => board.mismatchIds.length > 0)) {
    return state.lockUntil === 0 ? state : { ...state, lockUntil: 0 };
  }

  return {
    ...state,
    lockUntil: 0,
    activeBoardIndex: getNextPlayableBoardIndex(state, state.activeBoardIndex),
    boards: state.boards.map((board) => ({ ...board, mismatchIds: [] }))
  };
}

export function getElapsedMs(state: GameState, now = Date.now()): number {
  if (state.startedAt === null) {
    return 0;
  }

  return (state.finishedAt ?? now) - state.startedAt;
}

export function getBoardCompletion(board: BoardState): number {
  return board.matchedIds.length / board.cards.length;
}

export function getBoardSolvedMatches(board: BoardState): number {
  return board.matchedIds.length / 2;
}

export function getBoardTotalMatches(board: BoardState): number {
  return board.cards.length / 2;
}

export function isBoardComplete(board: BoardState): boolean {
  return board.matchedIds.length === board.cards.length;
}

function createBoard(
  index: number,
  seed: number,
  difficulty: DifficultyId
): BoardState {
  const boardId = index + 1;
  const difficultyConfig = getDifficultyConfig(difficulty);

  return {
    id: boardId,
    columns: difficultyConfig.columns,
    difficulty,
    cards: shuffleDeck(createDeck(boardId, difficulty), seed + boardId * 9973),
    revealedIds: [],
    pendingId: null,
    matchedIds: [],
    mismatchIds: []
  };
}

function updateBoard(
  state: GameState,
  boardIndex: number,
  patch: Partial<BoardState>
): GameState {
  return {
    ...state,
    boards: state.boards.map((board, index) =>
      index === boardIndex ? { ...board, ...patch } : board
    )
  };
}

function getNextBoardIndex(state: GameState, boardIndex: number): number {
  return (boardIndex + 1) % state.parallelCount;
}

function getNextPlayableBoardIndex(state: GameState, boardIndex: number): number {
  for (let step = 1; step <= state.parallelCount; step += 1) {
    const nextIndex = (boardIndex + step) % state.parallelCount;
    if (!isBoardComplete(state.boards[nextIndex])) {
      return nextIndex;
    }
  }

  return boardIndex;
}

function areAllBoardsComplete(state: GameState): boolean {
  return state.boards.every(isBoardComplete);
}
