import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import DiaryWizard from "./pages/DiaryWizard";
import DailyCheckIn from "./pages/DailyCheckIn";
import WeeklyReview from "./pages/WeeklyReview";
import MoodTracker from "./pages/MoodTracker";
import BodyCues from "./pages/BodyCues";
import SpiralTracker from "./pages/SpiralTracker";
import Journal from "./pages/Journal";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Insights from "./pages/Insights";
import DayView from "./pages/DayView";
import Timeline from "./pages/Timeline";
import SkillsReference from "./pages/SkillsReference";
import ToolsHub from "./pages/ToolsHub";
import SafetyPlan from "./pages/SafetyPlan";
import UrgeTimer from "./pages/UrgeTimer";
import DistressToolkit from "./pages/DistressToolkit";
import PrintDiaryWeek from "./pages/PrintDiaryWeek";
import PrintMonthSummary from "./pages/PrintMonthSummary";
import PrintTherapyBundle from "./pages/PrintTherapyBundle";
import CalendarPage from "./pages/CalendarPage";
import SetupWizard from "./pages/SetupWizard";
import { AppPinnedStrip } from "./components/AppPinnedStrip";
import { GlobalGentleReminders } from "./components/GlobalGentleReminders";
import { QuickAddDialog } from "./components/QuickAddDialog";
import { SplashScreen } from "./components/SplashScreen";
import { todayISO } from "./diary/diaryWeekModel";
import TherapyJourney from "./pages/TherapyJourney";
import { loadLargeTextEnabled, loadStreak } from "./storage";

function greetingLine() {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function App() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isSetup = location.pathname === "/setup";
  const todayPath = `/day/${todayISO()}`;
  const [greetTick, setGreetTick] = useState(0);
  const [streakTick, setStreakTick] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const id = window.setInterval(() => setGreetTick((n) => n + 1), 60_000);
    const onVis = () => setGreetTick((n) => n + 1);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  useEffect(() => {
    const fn = () => setStreakTick((n) => n + 1);
    window.addEventListener("dbt-streak-updated", fn);
    return () => window.removeEventListener("dbt-streak-updated", fn);
  }, []);
  useEffect(() => {
    if (loadLargeTextEnabled()) document.documentElement.classList.add("a11y-large-text");
  }, []);
  useEffect(() => {
    const id = window.setTimeout(() => setShowSplash(false), 1600);
    return () => window.clearTimeout(id);
  }, []);
  void greetTick;
  void streakTick;
  const greet = greetingLine();
  const streak = loadStreak();

  return (
    <div className={`app-shell${isLanding ? " app-shell--landing" : ""}${isSetup ? " app-shell--setup" : ""}`}>
      {showSplash ? (
        <SplashScreen
          title="Polaris"
          subtitle="Therapy Companion"
          onDone={() => setShowSplash(false)}
        />
      ) : null}
      {!isLanding && !isSetup ? (
        <header className="app-header app-header--streamlined">
          <div className="header-intro">
            <div className="header-intro-text">
              <div className="greet-time brand-heading">{greet}</div>
              <p className="greet-sub">
                Your main shortcuts are below. <strong>Home</strong> and <strong>Tools</strong> hold everything
                else—take it at your own pace.
              </p>
            </div>
            <div className="header-intro-actions">
              <QuickAddDialog />
            </div>
            {streak.currentStreak > 0 ? (
              <span className="streak-pill streak-pill-nav" title="Guided check-in streak">
                {streak.currentStreak}d streak
              </span>
            ) : null}
          </div>
          <div className="nav-shell">
            <nav className="nav nav-main" aria-label="Main">
              <NavLink className={({ isActive }) => (isActive ? "active" : undefined)} to="/dashboard">
                Home
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "active" : undefined)} to="/daily">
                Check-in
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "active" : undefined)} to="/journal">
                Journal
              </NavLink>
              <NavLink end className={({ isActive }) => (isActive ? "active" : undefined)} to={todayPath}>
                Today
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "active" : undefined)} to="/calendar">
                Calendar
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "active" : undefined)} to="/therapy">
                Therapy
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "active" : undefined)} to="/tools">
                Tools
              </NavLink>
            </nav>
          </div>
          <AppPinnedStrip />
        </header>
      ) : null}
      {!isLanding && !isSetup ? <GlobalGentleReminders /> : null}
      <main className="app-outlet" key={location.pathname}>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tools" element={<ToolsHub />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/daily" element={<DiaryWizard />} />
        <Route path="/diary-sheet" element={<DailyCheckIn />} />
        <Route path="/weekly" element={<WeeklyReview />} />
        <Route path="/mood" element={<MoodTracker />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/therapy" element={<TherapyJourney />} />
        <Route path="/search" element={<Navigate to="/therapy?tab=search" replace />} />
        <Route path="/day" element={<Navigate to={`/day/${todayISO()}`} replace />} />
        <Route path="/day/:date" element={<DayView />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/skills" element={<SkillsReference />} />
        <Route path="/body" element={<BodyCues />} />
        <Route path="/spiral" element={<SpiralTracker />} />
        <Route path="/safety" element={<SafetyPlan />} />
        <Route path="/urge-timer" element={<UrgeTimer />} />
        <Route path="/distress" element={<DistressToolkit />} />
        <Route path="/print/diary-week" element={<PrintDiaryWeek />} />
        <Route path="/print/month" element={<PrintMonthSummary />} />
        <Route path="/print/therapy-bundle" element={<PrintTherapyBundle />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
