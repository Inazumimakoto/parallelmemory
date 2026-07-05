import {
  RotateCcw,
  Share2,
  Shuffle,
  Trophy,
  TimerReset,
  Zap
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import { DIFFICULTIES, suitColor, suitGlyph } from "./game/deck";
import {
  MAX_PARALLEL_COUNT,
  createGame,
  createNewGame,
  flipCard,
  getBoardCompletion,
  getBoardSolvedMatches,
  getBoardTotalMatches,
  getElapsedMs,
  restartGame,
  settleMismatches
} from "./game/game";
import type { BoardState, Card, DifficultyId, GameState } from "./game/types";

const initialGame = () => createGame(3);

export default function App() {
  const [game, setGame] = useState<GameState>(initialGame);
  const [now, setNow] = useState(Date.now());
  const [clearEvent, setClearEvent] = useState<ClearEvent | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setGame((currentGame) => settleMismatches(currentGame, current));
    }, 120);

    return () => window.clearInterval(timer);
  }, []);

  const activeBoard = game.boards[game.activeBoardIndex];
  const totalMatches = game.boards.reduce(
    (sum, board) => sum + getBoardTotalMatches(board),
    0
  );
  const elapsedMs = getElapsedMs(game, now);
  const isLocked = game.lockUntil > now;
  const statusText = game.finishedAt
    ? "Complete"
    : isLocked
      ? "Checking"
      : "Ready";
  const difficulty =
    DIFFICULTIES.find((item) => item.id === game.difficulty) ?? DIFFICULTIES[0];
  const resultSummary = buildResultSummary(
    game,
    elapsedMs,
    totalMatches,
    difficulty
  );

  useEffect(() => {
    if (game.finishedAt !== null) {
      setClearEvent({
        key: `${game.seed}-${game.difficulty}-${game.finishedAt}`
      });
    }
  }, [game.difficulty, game.finishedAt, game.seed]);

  useEffect(() => {
    if (!clearEvent) {
      return;
    }

    const timer = window.setTimeout(() => setClearEvent(null), 1900);
    return () => window.clearTimeout(timer);
  }, [clearEvent]);

  function replaceGame(nextGame: GameState) {
    setClearEvent(null);
    setGame(nextGame);
  }

  function handleParallelChange(nextCount: number) {
    replaceGame(createNewGame(nextCount, game.difficulty));
  }

  function handleDifficultyChange(nextDifficulty: DifficultyId) {
    replaceGame(createNewGame(game.parallelCount, nextDifficulty));
  }

  function handleRestart() {
    replaceGame(restartGame(game));
  }

  function handleNewGame() {
    replaceGame(createNewGame(game.parallelCount, game.difficulty));
  }

  function handleNextParallel() {
    replaceGame(
      createNewGame(
        Math.min(MAX_PARALLEL_COUNT, game.parallelCount + 1),
        game.difficulty
      )
    );
  }

  async function handleShareResult() {
    const shareText = createShareText(resultSummary);
    const pageUrl = `${window.location.origin}${window.location.pathname}`;
    const shareData = {
      title: "Parallel Memory",
      text: shareText,
      url: pageUrl
    };
    const shareNavigator = navigator as Navigator & {
      share?: (data: typeof shareData) => Promise<void>;
    };

    if (typeof shareNavigator.share === "function") {
      try {
        await shareNavigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      }
    }

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `${shareText}\n${pageUrl}`
    )}`;
    window.open(tweetUrl, "_blank", "noopener,noreferrer");
  }

  function handleFlip(boardIndex: number, cardId: string) {
    setGame((currentGame) => flipCard(currentGame, boardIndex, cardId));
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            PM
          </div>
          <div>
            <h1>Parallel Memory</h1>
            <p>{game.parallelCount}並列</p>
          </div>
        </div>

        <div className="top-controls">
          <div className="difficulty-control">
            <span className="label">難易度</span>
            <div className="difficulty-picker" aria-label="Difficulty">
              {DIFFICULTIES.map((difficulty) => (
                <button
                  className={difficulty.id === game.difficulty ? "is-selected" : ""}
                  data-testid={`difficulty-${difficulty.id}`}
                  key={difficulty.id}
                  onClick={() => handleDifficultyChange(difficulty.id)}
                  type="button"
                >
                  <strong>{difficulty.label}</strong>
                  <span>{difficulty.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="parallel-control">
            <span className="label">並列数</span>
            <div className="parallel-picker" aria-label="Parallel count">
              {Array.from({ length: MAX_PARALLEL_COUNT }, (_, index) => index + 1).map(
                (count) => (
                  <button
                    className={count === game.parallelCount ? "is-selected" : ""}
                    data-testid={`parallel-count-${count}`}
                    key={count}
                    onClick={() => handleParallelChange(count)}
                    type="button"
                  >
                    {count}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="command-actions">
          <button
            className="icon-button secondary"
            data-testid="restart-button"
            aria-label="Retry Deck: same layout"
            onClick={handleRestart}
            title="同じ配置でもう一度"
            type="button"
          >
            <RotateCcw aria-hidden="true" />
            Retry Deck
          </button>
          <button
            className="icon-button primary"
            onClick={handleNewGame}
            data-testid="new-game-button"
            aria-label="New Shuffle: reshuffle"
            title="同じ設定で新しい配置"
            type="button"
          >
            <Shuffle aria-hidden="true" />
            New Shuffle
          </button>
        </div>
      </header>

      <section className="stats-panel" aria-label="Game stats">
        <div className="stat-grid">
          <Metric icon={<TimerReset />} label="Time" value={formatTime(elapsedMs)} />
          <Metric icon={<Zap />} label="Moves" value={game.moves.toString()} />
          <Metric
            icon={<Trophy />}
            label="Matches"
            value={`${game.matches}/${totalMatches}`}
          />
        </div>
      </section>

      <section className="play-surface" aria-label="Active board">
        <div className="board-header">
          <div>
            <span className="label">Board</span>
            <h2>
              Board {activeBoard.id} / {game.parallelCount}
            </h2>
          </div>
          <div className={`status-pill ${statusText.toLowerCase()}`}>
            {statusText}
          </div>
        </div>

        <CardGrid
          board={activeBoard}
          boardIndex={game.activeBoardIndex}
          isLocked={isLocked}
          onFlip={handleFlip}
        />
      </section>

      <aside className="turn-panel" aria-label="Board order">
        <div className="turn-header">
          <span className="label">Turn rail</span>
          <strong>
            {game.activeBoardIndex + 1} / {game.parallelCount}
          </strong>
        </div>

        <div className="board-list">
          {game.boards.map((board, index) => (
            <BoardProgress
              board={board}
              isActive={index === game.activeBoardIndex}
              key={board.id}
            />
          ))}
        </div>
      </aside>

      {game.finishedAt !== null && (
        <ResultModal
          canAdvance={game.parallelCount < MAX_PARALLEL_COUNT}
          onNewShuffle={handleNewGame}
          onNextParallel={handleNextParallel}
          onRetry={handleRestart}
          onShare={handleShareResult}
          summary={resultSummary}
        />
      )}

      {clearEvent && <ClearCelebration event={clearEvent} />}
    </main>
  );
}

type ResultRank = "S" | "A" | "B" | "C";

type ResultSummary = {
  difficultyDetail: string;
  difficultyLabel: string;
  matches: number;
  moves: number;
  parallelCount: number;
  rank: ResultRank;
  time: string;
  totalMatches: number;
};

function ResultModal({
  canAdvance,
  onNewShuffle,
  onNextParallel,
  onRetry,
  onShare,
  summary
}: {
  canAdvance: boolean;
  onNewShuffle: () => void;
  onNextParallel: () => void;
  onRetry: () => void;
  onShare: () => void;
  summary: ResultSummary;
}) {
  return (
    <div className="result-backdrop">
      <section
        aria-labelledby="result-title"
        aria-modal="true"
        className="result-modal"
        role="dialog"
      >
        <div className="result-header">
          <div>
            <span className="label">All Clear</span>
            <h2 id="result-title">Result</h2>
          </div>
          <div className={`result-rank rank-${summary.rank.toLowerCase()}`}>
            <span>Rank</span>
            <strong>{summary.rank}</strong>
          </div>
        </div>

        <div className="result-summary">
          <strong>
            {summary.difficultyLabel} {summary.difficultyDetail}
          </strong>
          <span>{summary.parallelCount}並列クリア</span>
        </div>

        <div className="result-grid" aria-label="Result stats">
          <ResultStat label="Time" value={summary.time} />
          <ResultStat label="Moves" value={summary.moves.toString()} />
          <ResultStat
            label="Matches"
            value={`${summary.matches}/${summary.totalMatches}`}
          />
        </div>

        <div className="result-actions">
          <button
            className="icon-button share-button"
            onClick={onShare}
            title="結果をX/Twitterでシェア"
            type="button"
          >
            <Share2 aria-hidden="true" />
            Share to X
          </button>
          {canAdvance ? (
            <button
              className="icon-button secondary"
              onClick={onNextParallel}
              title="並列数を1つ上げて開始"
              type="button"
            >
              <Zap aria-hidden="true" />
              Next Parallel
            </button>
          ) : null}
          <button
            className="icon-button secondary"
            onClick={onRetry}
            title="同じ配置でもう一度"
            type="button"
          >
            <RotateCcw aria-hidden="true" />
            Retry Deck
          </button>
          <button
            className="icon-button primary"
            onClick={onNewShuffle}
            title="同じ設定で新しい配置"
            type="button"
          >
            <Shuffle aria-hidden="true" />
            New Shuffle
          </button>
        </div>
      </section>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      <span className="metric-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CardGrid({
  board,
  boardIndex,
  isLocked,
  onFlip
}: {
  board: BoardState;
  boardIndex: number;
  isLocked: boolean;
  onFlip: (boardIndex: number, cardId: string) => void;
}) {
  const boardMaxWidth =
    board.columns >= 13 ? "100%" : `${board.columns * 76 + (board.columns - 1) * 8}px`;
  const gridStyle = {
    "--board-columns": board.columns,
    "--board-max-width": boardMaxWidth,
    "--mobile-board-columns": Math.min(board.columns, 4)
  } as CSSProperties;

  return (
    <div className="card-grid" style={gridStyle}>
      {board.cards.map((card, index) => {
        const isMatched = board.matchedIds.includes(card.id);
        const isRevealed =
          isMatched ||
          board.revealedIds.includes(card.id) ||
          board.mismatchIds.includes(card.id);

        return (
          <PlayingCard
            card={card}
            index={index}
            isDisabled={isLocked || isMatched}
            isMatched={isMatched}
            isRevealed={isRevealed}
            key={card.id}
            onClick={() => onFlip(boardIndex, card.id)}
          />
        );
      })}
    </div>
  );
}

function PlayingCard({
  card,
  index,
  isDisabled,
  isMatched,
  isRevealed,
  onClick
}: {
  card: Card;
  index: number;
  isDisabled: boolean;
  isMatched: boolean;
  isRevealed: boolean;
  onClick: () => void;
}) {
  const color = suitColor[card.suit];

  return (
    <button
      aria-label={isRevealed ? `${card.rank}${suitGlyph[card.suit]}` : "Face down"}
      className={[
        "playing-card",
        isRevealed ? "is-revealed" : "",
        isMatched ? "is-matched" : "",
        color
      ].join(" ")}
      disabled={isDisabled}
      data-testid={`card-${index}`}
      onClick={onClick}
      type="button"
    >
      <span className="card-face">
        <span className="corner top">
          <strong>{card.rank}</strong>
          <em>{suitGlyph[card.suit]}</em>
        </span>
        <span className="center-suit">{suitGlyph[card.suit]}</span>
        <span className="corner bottom">
          <strong>{card.rank}</strong>
          <em>{suitGlyph[card.suit]}</em>
        </span>
      </span>
      <span className="card-back" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

function BoardProgress({
  board,
  isActive
}: {
  board: BoardState;
  isActive: boolean;
}) {
  const percent = Math.round(getBoardCompletion(board) * 100);
  const pendingCount = board.pendingId ? 1 : 0;
  const miniGridStyle = {
    "--mini-columns": board.columns
  } as CSSProperties;
  const revealedSet = useMemo(
    () =>
      new Set([
        ...board.matchedIds,
        ...board.revealedIds,
        ...board.mismatchIds
      ]),
    [board.matchedIds, board.mismatchIds, board.revealedIds]
  );

  return (
    <div className={`board-progress ${isActive ? "is-active" : ""}`}>
      <div className="board-progress-main">
        <span>{board.id}</span>
        <strong>Board {board.id}</strong>
      </div>
      <div className="mini-grid" aria-hidden="true" style={miniGridStyle}>
        {board.cards.map((card) => (
          <span
            className={revealedSet.has(card.id) ? "is-lit" : ""}
            key={card.id}
          />
        ))}
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="board-progress-meta">
        <span>
          {getBoardSolvedMatches(board)}/{getBoardTotalMatches(board)}
        </span>
        <span>{pendingCount}/2</span>
      </div>
    </div>
  );
}

type ClearEvent = {
  key: string;
};

function ClearCelebration({ event }: { event: ClearEvent }) {
  return (
    <div className="clear-celebration" key={event.key} aria-hidden="true">
      <div className="confetti-field" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

function buildResultSummary(
  game: GameState,
  elapsedMs: number,
  totalMatches: number,
  difficulty: (typeof DIFFICULTIES)[number]
): ResultSummary {
  return {
    difficultyDetail: difficulty.detail,
    difficultyLabel: difficulty.label,
    matches: game.matches,
    moves: game.moves,
    parallelCount: game.parallelCount,
    rank: getResultRank(game.moves, totalMatches),
    time: formatTime(elapsedMs),
    totalMatches
  };
}

function getResultRank(moves: number, totalMatches: number): ResultRank {
  const optimalMoves = Math.max(totalMatches * 2, 1);
  const moveRatio = moves / optimalMoves;

  if (moveRatio <= 1.05) {
    return "S";
  }

  if (moveRatio <= 1.4) {
    return "A";
  }

  if (moveRatio <= 2) {
    return "B";
  }

  return "C";
}

function createShareText(summary: ResultSummary): string {
  return [
    "Parallel Memory All Clear!",
    `${summary.difficultyLabel} ${summary.difficultyDetail} / ${summary.parallelCount}並列`,
    `Time ${summary.time} / ${summary.moves} moves / Rank ${summary.rank}`,
    "#ParallelMemory"
  ].join("\n");
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
