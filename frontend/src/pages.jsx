import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from './api.js';
import { useAuth } from './AuthContext.jsx';

const categories = [
  'Arts & Design',
  'Technology',
  'Languages',
  'Music',
  'Home & DIY',
  'Career & Study',
  'Other',
];

const emptyListing = {
  title: '',
  description: '',
  type: 'offer',
  category: categories[0],
  priority: 'medium',
};

function PageHeading({ eyebrow, title, children }) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="page-intro">{children}</p>}
    </div>
  );
}

function ListingCard({ listing, actions }) {
  const title = listing.status === 'completed' ? (
    <span>{listing.title}</span>
  ) : (
    <Link to={`/listings/${listing._id}`}>{listing.title}</Link>
  );

  return (
    <article className="listing-card">
      <div className="listing-card-top">
        <span className={`type-badge ${listing.type}`}>
          {listing.type === 'offer' ? 'Offering' : 'Looking for'}
        </span>
        {listing.status === 'completed' && <span className="status-badge">Completed</span>}
        <span className={`priority-label ${listing.priority}`}>{listing.priority} priority</span>
      </div>
      <h2 className="listing-title">{title}</h2>
      <p className="listing-description">{listing.description}</p>
      <div className="listing-meta">
        <span>{listing.category}</span>
        <span>By {listing.owner?.name || 'Community member'}</span>
        <time dateTime={listing.createdAt}>{new Date(listing.createdAt).toLocaleDateString()}</time>
      </div>
      {actions && <div className="listing-actions">{actions}</div>}
    </article>
  );
}

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    type: searchParams.get('type') || '',
    category: searchParams.get('category') || '',
    priority: searchParams.get('priority') || '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const queryString = searchParams.toString();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    apiRequest(`/api/listings${queryString ? `?${queryString}` : ''}`)
      .then((result) => { if (active) setListings(result.listings); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [queryString]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    const next = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    setSearchParams(next);
  }

  return (
    <main className="content-area">
      <PageHeading eyebrow="COMMUNITY SKILL EXCHANGE" title="Good skills travel.">
        Find a neighbor to learn from, or share something you know.
      </PageHeading>

      <form className="filter-bar" onSubmit={applyFilters}>
        <label className="filter-search">
          <span>Search listings</span>
          <input name="q" onChange={updateFilter} placeholder="Try ‘guitar’ or ‘Excel’" value={filters.q} />
        </label>
        <label>
          <span>Type</span>
          <select name="type" onChange={updateFilter} value={filters.type}>
            <option value="">All types</option>
            <option value="offer">Offering</option>
            <option value="request">Looking for</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select name="category" onChange={updateFilter} value={filters.category}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select name="priority" onChange={updateFilter} value={filters.priority}>
            <option value="">Any priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <button className="button button-dark filter-button" type="submit">Search</button>
      </form>

      <section className="listing-results" aria-live="polite">
        <div className="section-heading">
          <h2>Open listings</h2>
          {!isLoading && <span>{listings.length} {listings.length === 1 ? 'listing' : 'listings'}</span>}
        </div>
        {isLoading && <p className="page-message">Loading listings...</p>}
        {error && <p className="form-message error" role="alert">{error}</p>}
        {!isLoading && !error && listings.length === 0 && (
          <div className="empty-state">
            <h3>No matches yet</h3>
            <p>Try another search or be the first to post a skill.</p>
            <Link className="text-link" to="/register">Join to post a listing</Link>
          </div>
        )}
        <div className="listing-grid">
          {listings.map((listing) => <ListingCard key={listing._id} listing={listing} />)}
        </div>
      </section>
    </main>
  );
}

export function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      await refreshUser();
      navigate(location.state?.returnTo || '/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="narrow-content">
      <section className="form-panel auth-panel">
        <PageHeading
          eyebrow={isRegister ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}
          title={isRegister ? 'Make an account' : 'Sign in'}
        />
        <form className="stacked-form" onSubmit={submit}>
          {isRegister && (
            <label className="field">
              <span>Your name <b>*</b></span>
              <input autoComplete="name" maxLength={60} name="name" onChange={updateField} required value={form.name} />
            </label>
          )}
          <label className="field">
            <span>Email <b>*</b></span>
            <input autoComplete="email" maxLength={254} name="email" onChange={updateField} required type="email" value={form.email} />
          </label>
          <label className="field">
            <span>Password <b>*</b></span>
            <input
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              maxLength={72}
              minLength={isRegister ? 8 : 1}
              name="password"
              onChange={updateField}
              required
              type="password"
              value={form.password}
            />
            {isRegister && <small>Use at least 8 characters.</small>}
          </label>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <button className="button button-dark submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? 'Already a member?' : 'New to SkillSwap?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </section>
    </main>
  );
}

export function ListingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [form, setForm] = useState(emptyListing);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    apiRequest('/api/listings/mine?status=all')
      .then(({ listings }) => {
        const listing = listings.find((item) => item._id === id);
        if (!listing) throw new Error('Listing not found in your account.');
        if (active) setForm({
          title: listing.title,
          description: listing.description,
          type: listing.type,
          category: listing.category,
          priority: listing.priority,
        });
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await apiRequest(isEditing ? `/api/listings/${id}` : '/api/listings', {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      });
      navigate('/my-listings');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <p className="page-message">Loading your listing...</p>;

  return (
    <main className="narrow-content">
      <section className="form-panel">
        <PageHeading eyebrow={isEditing ? 'YOUR LISTING' : 'NEW LISTING'} title={isEditing ? 'Edit listing' : 'Put it out there'} />
        {error && <p className="form-message error" role="alert">{error}</p>}
        <form className="stacked-form" onSubmit={submit}>
          <fieldset className="type-picker">
            <legend>I want to...</legend>
            <div className="segmented-control">
              {['offer', 'request'].map((type) => (
                <button className={form.type === type ? 'selected' : ''} key={type} type="button" aria-pressed={form.type === type} onClick={() => setForm((current) => ({ ...current, type }))}>
                  {type === 'offer' ? 'Offer a skill' : 'Ask for help'}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>Listing title <b>*</b></span>
            <input maxLength={100} name="title" onChange={updateField} placeholder={form.type === 'offer' ? 'I can teach...' : 'I need help with...'} required value={form.title} />
          </label>
          <label className="field">
            <span>Description <b>*</b></span>
            <textarea maxLength={1000} name="description" onChange={updateField} required rows={5} value={form.description} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Category <b>*</b></span>
              <select name="category" onChange={updateField} value={form.category}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Priority <b>*</b></span>
              <select name="priority" onChange={updateField} value={form.priority}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <button className="button button-dark submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Post listing'}
          </button>
        </form>
      </section>
    </main>
  );
}

export function ListingDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest(`/api/listings/${id}`)
      .then((result) => { if (active) setListing(result.listing); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (isLoading) return <p className="page-message">Loading listing...</p>;
  if (error) return <main className="content-area"><div className="empty-state"><h2>Listing unavailable</h2><p>{error}</p><Link className="text-link" to="/">Back to explore</Link></div></main>;

  const isOwner = user && String(listing.owner?._id) === String(user.id);
  return (
    <main className="narrow-content detail-page">
      <Link className="back-link" to="/">← Back to explore</Link>
      <article className="detail-panel">
        <div className="listing-card-top">
          <span className={`type-badge ${listing.type}`}>{listing.type === 'offer' ? 'Offering' : 'Looking for'}</span>
          <span className={`priority-label ${listing.priority}`}>{listing.priority} priority</span>
        </div>
        <h1>{listing.title}</h1>
        <p className="detail-description">{listing.description}</p>
        <dl className="detail-meta">
          <div><dt>Category</dt><dd>{listing.category}</dd></div>
          <div><dt>Posted by</dt><dd>{listing.owner?.name || 'Community member'}</dd></div>
          <div><dt>Posted</dt><dd>{new Date(listing.createdAt).toLocaleString()}</dd></div>
        </dl>
        {isOwner ? (
          <Link className="button button-dark" to={`/listings/${listing._id}/edit`}>Edit your listing</Link>
        ) : (
          <p className="contact-note">Want to connect? Sign in to reach out to this member.</p>
        )}
      </article>
    </main>
  );
}

export function MyListingsPage() {
  const [status, setStatus] = useState('all');
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    apiRequest(`/api/listings/mine?status=${status}`)
      .then((result) => { if (active) setListings(result.listings); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [status, refresh]);

  async function changeStatus(listing, nextStatus) {
    try {
      await apiRequest(`/api/listings/${listing._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setRefresh((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteListing(id) {
    try {
      await apiRequest(`/api/listings/${id}`, { method: 'DELETE' });
      setConfirmDelete('');
      setRefresh((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="content-area">
      <PageHeading eyebrow="YOUR CORNER OF THE COMMUNITY" title="My listings">
        Keep your offers and requests up to date.
      </PageHeading>
      <div className="status-tabs" role="tablist" aria-label="Filter your listings">
        {['all', 'open', 'completed'].map((value) => (
          <button className={status === value ? 'active' : ''} key={value} onClick={() => setStatus(value)} role="tab" aria-selected={status === value} type="button">
            {value === 'all' ? 'All' : value === 'open' ? 'Open' : 'Completed'}
          </button>
        ))}
      </div>
      {error && <p className="form-message error" role="alert">{error}</p>}
      {isLoading && <p className="page-message">Loading your listings...</p>}
      {!isLoading && !error && listings.length === 0 && (
        <div className="empty-state">
          <h2>No {status === 'all' ? '' : `${status} `}listings yet</h2>
          <p>Your posts will appear here.</p>
          <Link className="button button-dark" to="/listings/new">Create a listing</Link>
        </div>
      )}
      <div className="listing-grid">
        {listings.map((listing) => (
          <ListingCard
            key={listing._id}
            listing={listing}
            actions={(
              <>
                <Link className="small-action" to={`/listings/${listing._id}/edit`}>Edit</Link>
                <button className="small-action" onClick={() => changeStatus(listing, listing.status === 'open' ? 'completed' : 'open')} type="button">
                  Mark {listing.status === 'open' ? 'completed' : 'open'}
                </button>
                {confirmDelete === listing._id ? (
                  <span className="delete-confirm">
                    <span>Delete?</span>
                    <button className="small-action danger" onClick={() => deleteListing(listing._id)} type="button">Confirm</button>
                    <button className="small-action" onClick={() => setConfirmDelete('')} type="button">Cancel</button>
                  </span>
                ) : (
                  <button className="small-action danger" onClick={() => setConfirmDelete(listing._id)} type="button">Delete</button>
                )}
              </>
            )}
          />
        ))}
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="content-area empty-state">
      <h1>Page not found</h1>
      <Link className="text-link" to="/">Back to explore</Link>
    </main>
  );
}