import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuthStore } from '../store';
import '../styles/settings.css';

interface UserProfile {
  userId: number;
  username: string;
  email: string;
  timezone: string;
  initialCapital: number;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  address?: string;
  isActive: number;
  createdAt: string;
}

interface ApiKey {
  platform: string;
  configured: boolean;
}

/**
 * Convert ISO date string to YYYY-MM-DD format for HTML date input
 */
const formatDateForInput = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    // Handle both ISO strings and date strings
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { accessToken, logout } = useAuthStore();

  // Profile state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile update state
  const [timezone, setTimezone] = useState<string>('UTC');
  const [initialCapital, setInitialCapital] = useState<number>(0);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { platform: 'polymarket', configured: false },
    { platform: 'kalshi', configured: false },
    { platform: 'opinion', configured: false },
  ]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('polymarket');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load user profile
  useEffect(() => {
    if (!accessToken) {
      navigate('/');
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        
        // Load user profile
        const profileResponse = await apiClient.getProfile();
        if (profileResponse.data.success) {
          const userData = profileResponse.data.user;
          setUser(userData);
          setTimezone(userData.timezone || 'UTC');
          setInitialCapital(parseFloat(userData.initialCapital) || 0);
          setFirstName(userData.firstName || '');
          setLastName(userData.lastName || '');
          setDateOfBirth(formatDateForInput(userData.dateOfBirth));
          setAddress(userData.address || '');
        }

        // Load API keys
        const keysResponse = await apiClient.getApiKeys();
        if (keysResponse.data.success) {
          const configured = keysResponse.data.configuredPlatforms || [];
          setApiKeys([
            { platform: 'polymarket', configured: configured.includes('polymarket') },
            { platform: 'kalshi', configured: configured.includes('kalshi') },
            { platform: 'opinion', configured: configured.includes('opinion') },
          ]);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [accessToken, navigate]);

  // Update user profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateSuccess(false);

    try {
      setUpdateLoading(true);
      const response = await apiClient.updateProfile({
        timezone,
        initialCapital: parseFloat(String(initialCapital)),
        firstName,
        lastName,
        dateOfBirth,
        address,
      });

      if (response.data.success) {
        setUser(response.data.user);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Add/Update API Key
  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiKeySuccess(false);

    if (!apiKeyInput.trim()) {
      setError('API key cannot be empty');
      return;
    }

    try {
      setApiKeyLoading(true);
      const response = await apiClient.addApiKey(selectedPlatform, apiKeyInput);

      if (response.data.success) {
        setApiKeyInput('');
        setApiKeySuccess(true);

        // Update local API keys list
        setApiKeys(apiKeys.map(k =>
          k.platform === selectedPlatform ? { ...k, configured: true } : k
        ));

        setTimeout(() => setApiKeySuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add API key');
    } finally {
      setApiKeyLoading(false);
    }
  };

  // Remove API Key
  const handleRemoveApiKey = async (platform: string) => {
    if (!window.confirm(`Remove API key for ${platform}?`)) {
      return;
    }

    try {
      const response = await apiClient.removeApiKey(platform);

      if (response.data.success) {
        setApiKeys(apiKeys.map(k =>
          k.platform === platform ? { ...k, configured: false } : k
        ));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove API key');
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await apiClient.changePassword(currentPassword, newPassword);

      if (response.data.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess(true);
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return <div className="settings-container">{t('common.loading')}</div>;
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>⚙️ {t('settings.title')}</h1>
        <button className="logout-btn" onClick={handleLogout}>
          {t('common.logout')}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {user && (
        <div className="settings-section">
          <div className="section-header">
            <h2>{t('settings.userProfile')}</h2>
            <span className="section-icon">👤</span>
          </div>

          <div className="profile-info">
            <div className="info-row">
              <label>{t('settings.username')}:</label>
              <span>{user.username}</span>
            </div>
            <div className="info-row">
              <label>{t('settings.email')}:</label>
              <span>{user.email}</span>
            </div>
            <div className="info-row">
              <label>{t('settings.createdAt')}:</label>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="settings-section">
        <div className="section-header">
          <h2>{t('settings.profileSettings')}</h2>
          <span className="section-icon">📋</span>
        </div>

        <form onSubmit={handleUpdateProfile} className="settings-form">
          <div className="form-group">
            <label htmlFor="firstName">{t('settings.firstName')}:</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">{t('settings.lastName')}:</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="dateOfBirth">{t('settings.dateOfBirth')}:</label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">{t('settings.address')}:</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('settings.addressPlaceholder')}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="timezone">{t('settings.timezone')}:</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="form-input"
            >
              <option value="UTC">UTC</option>
              <option value="Europe/Prague">Europe/Prague (CET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="US/Eastern">US/Eastern (EST)</option>
              <option value="US/Central">US/Central (CST)</option>
              <option value="US/Mountain">US/Mountain (MST)</option>
              <option value="US/Pacific">US/Pacific (PST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Hong_Kong">Asia/Hong Kong (HKT)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="initialCapital">{t('settings.initialCapital')}:</label>
            <input
              id="initialCapital"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
              className="form-input"
            />
          </div>

          {updateSuccess && (
            <div className="success-message">{t('settings.updateSuccess')}</div>
          )}

          <button
            type="submit"
            disabled={updateLoading}
            className="submit-btn"
          >
            {updateLoading ? t('common.loading') : t('settings.updateProfile')}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h2>{t('settings.apiKeys')}</h2>
          <span className="section-icon">🔑</span>
        </div>

        <div className="api-keys-list">
          <h3>{t('settings.configuredKeys')}:</h3>
          {apiKeys.length > 0 ? (
            <div className="keys-grid">
              {apiKeys.map((key) => (
                <div key={key.platform} className="key-item">
                  <div className="key-info">
                    <span className="key-platform">{key.platform.toUpperCase()}</span>
                    <span className="key-status">
                      {key.configured ? '✓ Configured' : '✗ Not configured'}
                    </span>
                  </div>
                  {key.configured && (
                    <button
                      onClick={() => handleRemoveApiKey(key.platform)}
                      className="remove-key-btn"
                    >
                      {t('settings.remove')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>{t('settings.noKeys')}</p>
          )}
        </div>

        <form onSubmit={handleAddApiKey} className="settings-form api-key-form">
          <h3>{t('settings.addNewKey')}:</h3>

          <div className="form-group">
            <label htmlFor="platform">{t('settings.platform')}:</label>
            <select
              id="platform"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="form-input"
            >
              <option value="polymarket">Polymarket</option>
              <option value="kalshi">Kalshi</option>
              <option value="opinion">Opinion</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="apiKey">{t('settings.apiKeyValue')}:</label>
            <input
              id="apiKey"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={t('settings.enterApiKey')}
              className="form-input"
            />
          </div>

          {apiKeySuccess && (
            <div className="success-message">{t('settings.keyAddedSuccess')}</div>
          )}

          <button
            type="submit"
            disabled={apiKeyLoading}
            className="submit-btn"
          >
            {apiKeyLoading ? t('common.loading') : t('settings.addKey')}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h2>{t('settings.changePassword')}</h2>
          <span className="section-icon">🔐</span>
        </div>

        <form onSubmit={handleChangePassword} className="settings-form">
          <div className="form-group">
            <label htmlFor="currentPassword">{t('settings.currentPassword')}:</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">{t('settings.newPassword')}:</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('settings.confirmPassword')}:</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {passwordError && (
            <div className="error-message">{passwordError}</div>
          )}

          {passwordSuccess && (
            <div className="success-message">{t('settings.passwordChangeSuccess')}</div>
          )}

          <button
            type="submit"
            disabled={passwordLoading}
            className="submit-btn"
          >
            {passwordLoading ? t('common.loading') : t('settings.changePassword')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
