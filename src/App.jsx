import { useEffect, useState } from "react";
import UploadScreen from "./components/UploadScreen";
import GameScreen from "./components/GameScreen";
import LandingPage from "./components/LandingPage";
import { storage } from "./lib/storage";
import { makeSeed } from "./lib/chaos";

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

export default function App() {
  const path = usePath().replace(/\/+$/, "");
  // Operator-only route runs the Chaos Survivor game; everything else is the
  // public giveaway landing page with the QR.
  const isGiveaway = path === "/giveaway";

  if (!isGiveaway) return <LandingPage />;

  return <Operator />;
}

function Operator() {
  const [names, setNames] = useState(() => storage.getNames());
  const [winners, setWinners] = useState(() => storage.getWinners());
  const [seed, setSeed] = useState(() => storage.getSeed());

  // Ensure a seed exists whenever we have names but no seed yet.
  useEffect(() => {
    if (names.length > 0 && seed == null) {
      const s = makeSeed();
      setSeed(s);
      storage.setSeed(s);
    }
  }, [names, seed]);

  function handleReady(parsedNames) {
    const s = makeSeed();
    setNames(parsedNames);
    setWinners([]);
    setSeed(s);
    storage.setNames(parsedNames);
    storage.setWinners([]);
    storage.setSeed(s);
  }

  function handleWinnersChange(next) {
    setWinners(next);
    storage.setWinners(next);
  }

  function handleReset() {
    storage.reset();
    setNames([]);
    setWinners([]);
    setSeed(null);
  }

  const hasGame = names.length > 0 && seed != null;

  return hasGame ? (
    <GameScreen
      names={names}
      seed={seed}
      winners={winners}
      onWinnersChange={handleWinnersChange}
      onReset={handleReset}
    />
  ) : (
    <UploadScreen onReady={handleReady} />
  );
}
