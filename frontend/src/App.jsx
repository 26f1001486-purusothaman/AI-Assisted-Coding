import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import {
  AuthPage,
  BrowsePage,
  ListingDetailsPage,
  ListingFormPage,
  MyListingsPage,
  NotFoundPage,
} from './pages.jsx';

function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <p className="page-message">Checking your session...</p>;
  if (!user) return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
  return children;
}

function SiteLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="wordmark" to="/" aria-label="SkillSwap home">skill<span>swap</span></Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link to="/">Explore</Link>
          {user ? (
            <>
              <Link to="/my-listings">My listings</Link>
              <Link className="nav-post" to="/listings/new">Post a listing</Link>
              <span className="nav-user">{user.name}</span>
              <button className="nav-signout" type="button" onClick={handleSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link className="nav-post" to="/register">Join SkillSwap</Link>
            </>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/listings/:id" element={<ListingDetailsPage />} />
        <Route path="/listings/new" element={<RequireAuth><ListingFormPage /></RequireAuth>} />
        <Route path="/listings/:id/edit" element={<RequireAuth><ListingFormPage /></RequireAuth>} />
        <Route path="/my-listings" element={<RequireAuth><MyListingsPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
