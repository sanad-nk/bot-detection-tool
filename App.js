import React, { useState } from 'react';
import './App.css';

// Custom InfoIcon component to replace the lucide-react dependency
const InfoIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

function App() {
  const [formData, setFormData] = useState({
    username: '',
    followers_count: 0,
    friends_count: 0,
    listed_count: 0,
    favourites_count: 0,
    statuses_count: 0,
    default_profile: false,
    default_profile_image: false,
    verified: false,
    protected: false,
    geo_enabled: false,
    contributors_enabled: false
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pastPredictions, setPastPredictions] = useState([]);
  const [tooltipActive, setTooltipActive] = useState('');

  // Field descriptions for tooltips
  const fieldDescriptions = {
    id: "The unique identifier for the social media account (usually a username)",
    followers_count: "The number of accounts that follow this account",
    friends_count: "The number of accounts this account is following",
    listed_count: "The number of lists that include this account(mention or tagged)",
    favourites_count: "The number of posts this account has marked as favorite/liked",
    statuses_count: "The total number of posts/updates made by this account(social activity)",
    default_profile: "Whether the account is using a default theme/layout provided by the platform(no bio)",
    default_profile_image: "Whether the account is using a default profile picture rather than a custom one(no pfp)",
    verified: "Whether the account has been verified by the platform",
    protected: "Whether the account has privacy protections enabled(private account)",
    geo_enabled: "Whether the account has location services enabled",
    contributors_enabled: "Whether the account allows multiple contributors to post from it"
  };

  // Bot detection reasoning based on features
  const getBotReasoning = (data) => {
    let reasons = [];
    
    // Check followers to following ratio
    if (data.followers_count === 0 && data.friends_count > 100) {
      reasons.push("The account follows many users but has no followers, which is unusual for human accounts.");
    }
    
    if (data.friends_count > 1000 && data.followers_count / data.friends_count < 0.1) {
      reasons.push("The followers-to-following ratio is very low, which is common for bot accounts.");
    }
    
    // Check profile customization
    if (data.default_profile && data.default_profile_image) {
      reasons.push("The account uses both default profile settings and default profile image, suggesting automated creation.");
    }
    
    // Check activity patterns
    if (data.statuses_count > 10000 && data.statuses_count / (data.followers_count || 1) > 100) {
      reasons.push("The account has an unusually high number of posts relative to its follower count, most bots are prone to use automated posting.");
    }
    
    // Check engagement
    if (data.statuses_count > 1000 && data.favourites_count < 10) {
      reasons.push("Despite high activity, the account has very low engagement with other users' content.");
    }
    
    // Verification as a positive signal
    if (data.verified) {
      reasons.push("The account is verified, which is a strong indicator of a legitimate human user.");
    }
    
    // Default reasons if nothing specific was flagged
    if (reasons.length === 0) {
      if (data.is_bot) {
        reasons.push("The combination of account metrics matches patterns commonly seen in automated accounts.");
      } else {
        reasons.push("The account's behavior and characteristics align with typical human usage patterns.");
      }
    }
    
    return reasons;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account_data: formData }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Calculate a proper confidence percentage from the probability
        let confidencePercentage;
        
        if (data.probability && Array.isArray(data.probability)) {
          // If we have probability array, convert to percentage (0-100)
          confidencePercentage = Math.round(Math.max(...data.probability) * 90);
        } else if (data.confidence) {
          // If we only have confidence, convert to percentage
          confidencePercentage = Math.round(data.confidence * 90);
        } else {
          // Fallback
          confidencePercentage = 50;
        }
        
        // Add reasoning and proper confidence percentage to the result
        const resultWithReasoning = {
          ...data,
          confidencePercentage: confidencePercentage,
          reasons: getBotReasoning({...formData, is_bot: data.is_bot})
        };
        
        setResult(resultWithReasoning);
        // Add to past predictions
        setPastPredictions(prev => [resultWithReasoning, ...prev].slice(0, 10));
      } else {
        setError(data.error || 'Failed to get prediction');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showTooltip = (field) => {
    setTooltipActive(field);
  };

  const hideTooltip = () => {
    setTooltipActive('');
  };

  // Function to determine confidence level text
  const getConfidenceText = (confidence) => {
    const confidencePct = typeof confidence === 'number' ? 
      confidence * 80 : confidence;
    
    if (confidencePct >= 90) return "Very High";
    if (confidencePct >= 75) return "High";
    if (confidencePct >= 60) return "Moderate";
    if (confidencePct >= 50) return "Low";
    return "Very Low";
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bot Detection Dashboard</h1>
        <p>Advanced analysis to determine if a social media account is a bot or a real user</p>
      </header>
      
      <main className="app-main">
        <div className="input-section">
          <h2>Account Information</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">
                Account Username:
                <div 
                  className="info-icon"
                  onMouseEnter={() => showTooltip('id')}
                  onMouseLeave={hideTooltip}
                >
                  <InfoIcon />
                  {tooltipActive === 'id' && (
                    <div className="tooltip">{fieldDescriptions.id}</div>
                  )}
                </div>
              </label>
              <input
                type="text"
                id="id"
                name="id"
                value={formData.id}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="followers_count">
                  Followers:
                  <div 
                    className="info-icon"
                    onMouseEnter={() => showTooltip('followers_count')}
                    onMouseLeave={hideTooltip}
                  >
                    <InfoIcon />
                    {tooltipActive === 'followers_count' && (
                      <div className="tooltip">{fieldDescriptions.followers_count}</div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  id="followers_count"
                  name="followers_count"
                  value={formData.followers_count}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="friends_count">
                  Following:
                  <div 
                    className="info-icon"
                    onMouseEnter={() => showTooltip('friends_count')}
                    onMouseLeave={hideTooltip}
                  >
                    <InfoIcon />
                    {tooltipActive === 'friends_count' && (
                      <div className="tooltip">{fieldDescriptions.friends_count}</div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  id="friends_count"
                  name="friends_count"
                  value={formData.friends_count}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="listed_count">
                  Listed Count:
                  <div 
                    className="info-icon"
                    onMouseEnter={() => showTooltip('listed_count')}
                    onMouseLeave={hideTooltip}
                  >
                    <InfoIcon />
                    {tooltipActive === 'listed_count' && (
                      <div className="tooltip">{fieldDescriptions.listed_count}</div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  id="listed_count"
                  name="listed_count"
                  value={formData.listed_count}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="favourites_count">
                  Favorites:
                  <div 
                    className="info-icon"
                    onMouseEnter={() => showTooltip('favourites_count')}
                    onMouseLeave={hideTooltip}
                  >
                    <InfoIcon />
                    {tooltipActive === 'favourites_count' && (
                      <div className="tooltip">{fieldDescriptions.favourites_count}</div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  id="favourites_count"
                  name="favourites_count"
                  value={formData.favourites_count}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="statuses_count">
                Status Count:
                <div 
                  className="info-icon"
                  onMouseEnter={() => showTooltip('statuses_count')}
                  onMouseLeave={hideTooltip}
                >
                  <InfoIcon />
                  {tooltipActive === 'statuses_count' && (
                    <div className="tooltip">{fieldDescriptions.statuses_count}</div>
                  )}
                </div>
              </label>
              <input
                type="number"
                id="statuses_count"
                name="statuses_count"
                value={formData.statuses_count}
                onChange={handleChange}
                min="0"
              />
            </div>
            
            <div className="checkbox-section">
              <h3>Account Attributes</h3>
              <div className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="verified"
                    name="verified"
                    checked={formData.verified}
                    onChange={handleChange}
                  />
                  <label htmlFor="verified">
                    Verified
                    <div 
                      className="info-icon"
                      onMouseEnter={() => showTooltip('verified')}
                      onMouseLeave={hideTooltip}
                    >
                      <InfoIcon />
                      {tooltipActive === 'verified' && (
                        <div className="tooltip">{fieldDescriptions.verified}</div>
                      )}
                    </div>
                  </label>
                </div>
                
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="protected"
                    name="protected"
                    checked={formData.protected}
                    onChange={handleChange}
                  />
                  <label htmlFor="protected">
                    Protected
                    <div 
                      className="info-icon"
                      onMouseEnter={() => showTooltip('protected')}
                      onMouseLeave={hideTooltip}
                    >
                      <InfoIcon />
                      {tooltipActive === 'protected' && (
                        <div className="tooltip">{fieldDescriptions.protected}</div>
                      )}
                    </div>
                  </label>
                </div>
                
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="default_profile"
                    name="default_profile"
                    checked={formData.default_profile}
                    onChange={handleChange}
                  />
                  <label htmlFor="default_profile">
                    Default Profile
                    <div 
                      className="info-icon"
                      onMouseEnter={() => showTooltip('default_profile')}
                      onMouseLeave={hideTooltip}
                    >
                      <InfoIcon />
                      {tooltipActive === 'default_profile' && (
                        <div className="tooltip">{fieldDescriptions.default_profile}</div>
                      )}
                    </div>
                  </label>
                </div>
                
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="default_profile_image"
                    name="default_profile_image"
                    checked={formData.default_profile_image}
                    onChange={handleChange}
                  />
                  <label htmlFor="default_profile_image">
                    Default Image
                    <div 
                      className="info-icon"
                      onMouseEnter={() => showTooltip('default_profile_image')}
                      onMouseLeave={hideTooltip}
                    >
                      <InfoIcon />
                      {tooltipActive === 'default_profile_image' && (
                        <div className="tooltip">{fieldDescriptions.default_profile_image}</div>
                      )}
                    </div>  
                  </label>
                </div>
                
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="geo_enabled"
                    name="geo_enabled"
                    checked={formData.geo_enabled}
                    onChange={handleChange}
                  />
                  <label htmlFor="geo_enabled">
                    Geo Enabled
                    <div 
                      className="info-icon"
                      onMouseEnter={() => showTooltip('geo_enabled')}
                      onMouseLeave={hideTooltip}
                    >
                      <InfoIcon />
                      {tooltipActive === 'geo_enabled' && (
                        <div className="tooltip">{fieldDescriptions.geo_enabled}</div>
                      )}
                    </div>
                  </label>
                </div>
                
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="contributors_enabled"
                    name="contributors_enabled"
                    checked={formData.contributors_enabled}
                    onChange={handleChange}
                  />
                  <label htmlFor="contributors_enabled">
                    Contributors Enabled
                    <div 
                      className="info-icon"
                      onMouseEnter={() => showTooltip('contributors_enabled')}
                      onMouseLeave={hideTooltip}
                    >
                      <InfoIcon />
                      {tooltipActive === 'contributors_enabled' && (
                        <div className="tooltip">{fieldDescriptions.contributors_enabled}</div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Processing...' : 'Detect Bot'}
            </button>
          </form>
        </div>
        
        <div className="results-section">
          {error && <div className="error-message">{error}</div>}
          
          {result && (
            <div className={`result-card ${result.is_bot ? 'bot' : 'human'}`}>
              <h2>Detection Result</h2>
              <div className="result-header">
                <span className="account-id">ID: {result.account_id}</span>
                <span className={`result-badge ${result.is_bot ? 'bot' : 'human'}`}>
                  {result.is_bot ? 'BOT' : 'HUMAN'}
                </span>
              </div>
              
              <div className="confidence-container">
                <div className="confidence-header">
                  <div className="confidence-label">
                    Confidence: {result.confidencePercentage}% ({getConfidenceText(result.confidencePercentage)})
                  </div>
                </div>
                
                <div className="confidence-scale">
                  <div className="scale-markers">
                    {[0, 25, 50, 75, 90].map(mark => (
                      <div key={mark} className="scale-mark">
                        <div className="mark-line"></div>
                        <div className="mark-label">{mark}%</div>
                      </div>
                    ))}
                  </div>
                  <div className="meter-bar">
                    <div 
                      className="meter-fill" 
                      style={{ width: `${result.confidencePercentage}%` }}
                    ></div>
                    <div 
                      className="confidence-pointer"
                      style={{ left: `${result.confidencePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="result-reasoning">
                <h3>Analysis Reasoning</h3>
                <ul>
                  {result.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
              
              <div className="result-details">
                <p>
                  This account is {result.is_bot ? 'likely a bot' : 'likely a real user'} with 
                  {' '}{result.confidencePercentage}% confidence. Remember that bot detection is not an exact science,
                  and results should be interpreted with caution.
                </p>
              </div>
            </div>
          )}
          
          {pastPredictions.length > 0 && (
            <div className="past-predictions">
              <h3>Recent Predictions</h3>
              <ul>
                {pastPredictions.map((pred, index) => (
                  <li key={index} className={pred.is_bot ? 'bot' : 'human'}>
                    <span className="account-id">{pred.account_id}</span>
                    <div className="prediction-details">
                      <span className={`badge ${pred.is_bot ? 'bot' : 'human'}`}>
                        {pred.is_bot ? 'BOT' : 'HUMAN'}
                      </span>
                      <span className="confidence">
                        {pred.confidencePercentage}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
      
      <footer className="app-footer">
        <p>Bot Detection Dashboard &copy; 2025 - Results are for project</p>
      </footer>
    </div>
  );
}

export default App;