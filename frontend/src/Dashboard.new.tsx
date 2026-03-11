import React, { useState, useEffect } from 'react';
import './styles.css';
import { apiClient } from './services/api';
import { useAuthStore, usePortfolioStore } from './store';
import { useLanguage } from './context/LanguageContext';

export const Dashboard: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, accessToken, setUser, logout } = useAuthStore();
  const { portfolios, setPortfolios, setLoading: setPortfolioLoading, setError: setPortfolioError } = usePortfolioStore();
  const [showLoginForm, setShowLoginForm] = useState(!accessToken);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken && !user) {
      loadUserData();
    }
  }, [accessToken, user]);

  useEffect(() => {
    if (accessToken && user) {
      loadPortfolios();
    }
  }, [accessToken, user]);

  const loadUserData = async () => {
    try {
      const response = await apiClient.getProfile();
      setUser(response.data.user);
    } catch (err) {
      console.error('Failed to load user data:', err);
      setGeneralError(t('auth.failedLoadProfile'));
    }
  };

  const loadPortfolios = async () => {
    setPortfolioLoading(true);
    try {
      const response = await apiClient.getPortfolios();
      setPortfolios(response.data.portfolios || []);
    } catch (err) {
      console.error('Failed to load portfolios:', err);
      setPortfolioError(t('auth.failedLoadPortfolios'));
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    logout();
    setShowLoginForm(true);
  };

  const handleLanguageChange = (lang: 'en' | 'cz') => {
    setLanguage(lang);
  };

  if (showLoginForm) {
    return <LoginComponent onLoginSuccess={() => {
      setShowLoginForm(false);
    }} />;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>{t('dashboard.title')}</h1>
          <div className="user-info">
            <div className="language-switcher">
              <button
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                English
              </button>
              <button
                className={`lang-btn ${language === 'cz' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('cz')}
              >
                Čeština
              </button>
            </div>
            {user && (
              <>
                <span>{user.username} ({user.email})</span>
                <button onClick={handleLogout} className="btn-logout">
                  {t('common.logout')}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {generalError && <div className="alert alert-error">{generalError}</div>}

        {user && (
          <section className="user-section">
            <h2>{t('dashboard.profile')}</h2>
            <div className="user-stats">
              <div className="stat-card">
                <label>{t('common.username')}</label>
                <span>{user.username}</span>
              </div>
              <div className="stat-card">
                <label>{t('common.email')}</label>
                <span>{user.email}</span>
              </div>
              <div className="stat-card">
                <label>{t('user.initialCapital')}</label>
                <span>${user.initialCapital ? parseFloat(String(user.initialCapital)).toFixed(2) : '0.00'}</span>
              </div>
              <div className="stat-card">
                <label>{t('user.timezone')}</label>
                <span>{user.timezone}</span>
              </div>
            </div>
          </section>
        )}

        <section className="portfolios-section">
          <div className="section-header">
            <h2>{t('dashboard.portfolios')}</h2>
            <button className="btn-primary">{t('dashboard.newPortfolio')}</button>
          </div>

          {portfolios.length === 0 ? (
            <div className="empty-state">
              <p>{t('dashboard.noPortfolios')}</p>
            </div>
          ) : (
            <div className="portfolios-grid">
              {portfolios.map((portfolio) => (
                <div key={portfolio.portfolio_id} className="portfolio-card">
                  <h3>{portfolio.name}</h3>
                  <p className="description">{portfolio.description}</p>
                  
                  <div className="portfolio-stats">
                    <div className="stat">
                      <label>{t('portfolio.balance')}</label>
                      <span>${portfolio.current_balance ? parseFloat(String(portfolio.current_balance)).toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="stat">
                      <label>{t('portfolio.totalPnL')}</label>
                      <span className={portfolio.total_pnl && parseFloat(String(portfolio.total_pnl)) >= 0 ? 'positive' : 'negative'}>
                        ${portfolio.total_pnl ? parseFloat(String(portfolio.total_pnl)).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="stat">
                      <label>{t('portfolio.roi')}</label>
                      <span className={portfolio.roi_percent && portfolio.roi_percent >= 0 ? 'positive' : 'negative'}>
                        {portfolio.roi_percent ? portfolio.roi_percent.toFixed(2) : '0.00'}%
                      </span>
                    </div>
                  </div>

                  <div className="portfolio-actions">
                    <button className="btn-secondary">{t('portfolio.viewDetails')}</button>
                    <button className="btn-secondary">{t('portfolio.edit')}</button>
                    <button className="btn-danger">{t('portfolio.delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="trading-section">
          <h2>{t('dashboard.tradingFeatures')}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>{t('features.marketData')}</h3>
              <p>{t('features.marketDataDesc')}</p>
              <button className="btn-primary">{t('features.exploreMarkets')}</button>
            </div>
            <div className="feature-card">
              <h3>{t('features.strategies')}</h3>
              <p>{t('features.strategiesDesc')}</p>
              <button className="btn-primary">{t('features.viewStrategies')}</button>
            </div>
            <div className="feature-card">
              <h3>{t('features.analytics')}</h3>
              <p>{t('features.analyticsDesc')}</p>
              <button className="btn-primary">{t('features.dashboard')}</button>
            </div>
            <div className="feature-card">
              <h3>{t('features.settings')}</h3>
              <p>{t('features.settingsDesc')}</p>
              <button className="btn-primary">{t('features.settingsBtn')}</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="dashboard-footer">
        <p>{t('dashboard.copyright')}</p>
      </footer>
    </div>
  );
};

interface LoginComponentProps {
  onLoginSuccess: () => void;
}

export const LoginComponent: React.FC<LoginComponentProps> = ({ onLoginSuccess }) => {
  const { t, language, setLanguage } = useLanguage();
  const { setUser, setTokens } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.login(email, password);
      
      // Zustand persist middleware will handle localStorage automatically
      setTokens(response.data.accessToken, response.data.refreshToken);
      setUser(response.data.user);
      onLoginSuccess();
    } catch (err) {
      setError(t('auth.invalidCredentials'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: 'en' | 'cz') => {
    setLanguage(lang);
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="login-header">
          <h1>🤖 InvBot v2</h1>
          <div className="language-switcher-small">
            <button
              className={`lang-btn-small ${language === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              EN
            </button>
            <button
              className={`lang-btn-small ${language === 'cz' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('cz')}
            >
              CZ
            </button>
          </div>
        </div>
        <h2>{t('auth.signIn')}</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">{t('auth.usernameOrEmail')}</label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('common.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-large"
            disabled={loading}
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <div className="signup-link">
          <p>{t('auth.noAccount')} <a href="#signup">{t('auth.signUpHere')}</a></p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
