import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { apiClient } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import '../styles/portfolio-detail.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Portfolio {
  portfolio_id: number;
  name: string;
  description: string;
  initial_capital: number;
  current_balance: number;
  locked_capital: number;
  available_capital: number;
  total_pnl: number;
  roi_percent: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  created_at: string;
  updated_at: string;
}

interface Trade {
  trade_id: number;
  portfolio_id: number;
  market_id: string;
  market_name: string;
  strategy_id: number;
  initial_size_usd: number;
  current_size_usd: number;
  entry_price: number;
  current_price: number;
  status: string;
  pnl: number;
  pnl_percent: number;
  created_at: string;
  closed_at?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  offset: number;
  hasMore: boolean;
}

export const PortfolioDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const portfolioId = id ? parseInt(id) : 0;

  // Fetch portfolio data
  const loadPortfolioData = async () => {
    try {
      setRefreshing(true);
      const response = await apiClient.getPortfolio(portfolioId);
      if (response.data.success) {
        // Convert string numbers to actual numbers
        const p = response.data.portfolio;
        const convertedPortfolio: Portfolio = {
          ...p,
          initial_capital: parseFloat(String(p.initial_capital)) || 0,
          current_balance: parseFloat(String(p.current_balance)) || 0,
          locked_capital: parseFloat(String(p.locked_capital)) || 0,
          available_capital: parseFloat(String(p.available_capital)) || 0,
          total_pnl: parseFloat(String(p.total_pnl)) || 0,
          realized_pnl: parseFloat(String(p.realized_pnl)) || 0,
          unrealized_pnl: parseFloat(String(p.unrealized_pnl)) || 0,
          roi_percent: parseFloat(String(p.roi_percent)) || 0,
          total_trades: parseInt(String(p.total_trades)) || 0,
          winning_trades: parseInt(String(p.winning_trades)) || 0,
          losing_trades: parseInt(String(p.losing_trades)) || 0,
          win_rate: parseFloat(String(p.win_rate)) || 0,
        };
        setPortfolio(convertedPortfolio);
        setError(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load portfolio');
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch trades for portfolio
  const loadTrades = async (page: number) => {
    try {
      const response = await apiClient.getPortfolioTrades(portfolioId, page, 50);
      if (response.data.success) {
        // Convert string numbers to actual numbers for trades
        const convertedTrades: Trade[] = response.data.trades.map((t: any) => ({
          ...t,
          initial_size_usd: parseFloat(String(t.initial_size_usd)) || 0,
          current_size_usd: parseFloat(String(t.current_size_usd)) || 0,
          entry_price: parseFloat(String(t.entry_price)) || 0,
          current_price: parseFloat(String(t.current_price)) || 0,
          pnl: parseFloat(String(t.pnl)) || 0,
          pnl_percent: parseFloat(String(t.pnl_percent)) || 0,
        }));
        setTrades(convertedTrades);
        setPagination(response.data.pagination);
        setCurrentPage(page);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load trades');
    }
  };

  // Initial load
  useEffect(() => {
    if (portfolioId > 0) {
      loadPortfolioData();
      loadTrades(1);
      setLoading(false);
    }
  }, [portfolioId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (portfolioId > 0 && !refreshing) {
        loadPortfolioData();
        loadTrades(currentPage);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [portfolioId, currentPage, refreshing]);

  if (loading || !portfolio) {
    return (
      <div className="portfolio-detail-container loading">
        <div className="spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Chart data - using mock historical data (would be from backend)
  const chartData = {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: 'Portfolio Balance',
        data: Array.from(
          { length: 30 },
          (_, i) =>
            portfolio.initial_capital +
            (portfolio.total_pnl * (i + 1)) / 30
        ),
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderColor: '#4bc0c0',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#4bc0c0',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#ccc',
          font: { size: 12 },
        },
      },
      title: {
        display: true,
        text: 'Portfolio Performance',
        color: '#fff',
        font: { size: 14 },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#ccc' },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#ccc' },
      },
    },
  };

  const handlePageChange = (page: number) => {
    loadTrades(page);
  };

  return (
    <div className="portfolio-detail-container">
      <div className="portfolio-header">
        <div className="header-top">
          <button className="btn-back" onClick={() => navigate('/')}>
            ← {t('common.back') || 'Back'}
          </button>
          <div className="portfolio-title">
            <h1>{portfolio.name}</h1>
            <p className="description">{portfolio.description}</p>
          </div>
          <div className="portfolio-actions">
            <button className="btn-secondary" onClick={() => loadPortfolioData()}>
              {refreshing ? t('common.loading') : t('common.refresh') || 'Refresh'}
            </button>
            <button className="btn-secondary">{t('portfolio.edit') || 'Edit'}</button>
            <button className="btn-danger">{t('portfolio.delete') || 'Delete'}</button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Capital Section */}
      <section className="portfolio-section capital-section">
        <h2>{t('portfolio.capitalStatus') || 'Capital Status'}</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <label>{t('portfolio.initialCapital') || 'Initial Capital'}</label>
            <span className="value">
              ${portfolio.initial_capital.toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <label>{t('portfolio.balance') || 'Current Balance'}</label>
            <span className="value">
              ${portfolio.current_balance.toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <label>{t('portfolio.lockedCapital') || 'Locked Capital'}</label>
            <span className="value">
              ${portfolio.locked_capital.toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <label>{t('portfolio.availableCapital') || 'Available Capital'}</label>
            <span className="value">
              ${portfolio.available_capital.toFixed(2)}
            </span>
          </div>
        </div>
      </section>

      {/* Performance Section */}
      <section className="portfolio-section performance-section">
        <h2>{t('portfolio.performance') || 'Performance'}</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <label>{t('portfolio.totalPnL') || 'Total P&L'}</label>
            <span className={`value ${portfolio.total_pnl >= 0 ? 'positive' : 'negative'}`}>
              ${portfolio.total_pnl.toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <label>{t('portfolio.realizedPnL') || 'Realized P&L'}</label>
            <span className={`value ${portfolio.realized_pnl >= 0 ? 'positive' : 'negative'}`}>
              ${portfolio.realized_pnl.toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <label>{t('portfolio.unrealizedPnL') || 'Unrealized P&L'}</label>
            <span className={`value ${portfolio.unrealized_pnl >= 0 ? 'positive' : 'negative'}`}>
              ${portfolio.unrealized_pnl.toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <label>{t('portfolio.roi') || 'ROI'}</label>
            <span className={`value ${portfolio.roi_percent >= 0 ? 'positive' : 'negative'}`}>
              {portfolio.roi_percent.toFixed(2)}%
            </span>
          </div>
        </div>
      </section>

      {/* Trading Statistics Section */}
      <section className="portfolio-section stats-section">
        <h2>{t('portfolio.tradingStats') || 'Trading Statistics'}</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <label>{t('portfolio.totalTrades') || 'Total Trades'}</label>
            <span className="value">{portfolio.total_trades}</span>
          </div>
          <div className="stat-card">
            <label>{t('portfolio.winningTrades') || 'Winning Trades'}</label>
            <span className="value positive">{portfolio.winning_trades}</span>
          </div>
          <div className="stat-card">
            <label>{t('portfolio.losingTrades') || 'Losing Trades'}</label>
            <span className="value negative">{portfolio.losing_trades}</span>
          </div>
          <div className="stat-card">
            <label>{t('portfolio.winRate') || 'Win Rate'}</label>
            <span className={`value ${portfolio.win_rate >= 0.5 ? 'positive' : 'negative'}`}>
              {(portfolio.win_rate * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </section>

      {/* Performance Chart */}
      <section className="portfolio-section chart-section">
        <h2>{t('portfolio.performanceChart') || 'Performance Chart'}</h2>
        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      </section>

      {/* Trades Table */}
      <section className="portfolio-section trades-section">
        <h2>{t('portfolio.recentTrades') || 'Recent Trades'}</h2>

        {trades.length === 0 ? (
          <div className="empty-state">
            <p>{t('portfolio.noTrades') || 'No trades yet'}</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="trades-table">
                <thead>
                  <tr>
                    <th>{t('portfolio.market') || 'Market'}</th>
                    <th>{t('portfolio.size') || 'Size'}</th>
                    <th>{t('portfolio.entryPrice') || 'Entry Price'}</th>
                    <th>{t('portfolio.currentPrice') || 'Current Price'}</th>
                    <th>{t('portfolio.pnl') || 'P&L'}</th>
                    <th>{t('portfolio.status') || 'Status'}</th>
                    <th>{t('portfolio.date') || 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.trade_id}>
                      <td>{trade.market_name}</td>
                      <td>${trade.current_size_usd.toFixed(2)}</td>
                      <td>${trade.entry_price.toFixed(4)}</td>
                      <td>${trade.current_price.toFixed(4)}</td>
                      <td className={trade.pnl >= 0 ? 'positive' : 'negative'}>
                        ${trade.pnl.toFixed(2)} ({trade.pnl_percent.toFixed(2)}%)
                      </td>
                      <td>
                        <span className={`badge badge-${trade.status.toLowerCase()}`}>
                          {trade.status}
                        </span>
                      </td>
                      <td>{new Date(trade.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="btn-secondary"
                >
                  ← {t('common.previous') || 'Previous'}
                </button>
                <span className="page-info">
                  {t('portfolio.page') || 'Page'} {currentPage} {t('common.of') || 'of'} {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasMore}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="btn-secondary"
                >
                  {t('common.next') || 'Next'} →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default PortfolioDetail;
