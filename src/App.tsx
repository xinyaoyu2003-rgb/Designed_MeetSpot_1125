import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Plan from './pages/Plan';
import Confirm from './pages/Confirm';
import Balance from './pages/Balance';
import { PlannerProvider } from './context/PlannerContext';

function Nav() {
  const loc = useLocation();
  return (
    <nav className="nav">
      <Link to="/plan" className={loc.pathname === '/plan' || loc.pathname === '/' ? 'active' : ''}>第1步：头脑风暴</Link>
      <Link to="/confirm" className={loc.pathname === '/confirm' ? 'active' : ''}>第2步：活动推荐</Link>
      <Link to="/balance" className={loc.pathname === '/balance' ? 'active' : ''}>第3步：地点确认</Link>
    </nav>
  );
}

function Progress() {
  const loc = useLocation();
  const step = loc.pathname === '/balance' ? 3 : loc.pathname === '/confirm' ? 2 : 1;
  const total = 3;
  const pct = Math.round((step / total) * 100);
  return (
    <div className="progress">
      <div className="progress-meta">
        <span>第 {step} 步，共 {total} 步</span>
        <span>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-bar" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

export default function App() {
  const [logoError, setLogoError] = useState(false);
  return (
    <PlannerProvider>
      <div className="container">
        <header className="header center">
          {logoError ? (
            <h1>MeetSpot</h1>
          ) : (
            <img
              src="/meetspot-logo.png"
              alt="MeetSpot"
              className="brand-logo"
              onError={() => setLogoError(true)}
            />
          )}
          <p>通过AI策划帮助你和你的朋友寻找最适合的聚会活动和碰面地点！</p>
          <Nav />
          <Progress />
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Plan />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/confirm" element={<Confirm />} />
            <Route path="/balance" element={<Balance />} />
          </Routes>
        </main>
      </div>
    </PlannerProvider>
  );
}