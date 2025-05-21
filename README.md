# Bot Detection Tool

This is a complete web application for detecting whether social media accounts are bots or real users. The application consists of a Flask backend API and a React frontend dashboard.

## Features

- User-friendly dashboard to enter account information
- ML-powered bot detection based on account metrics and attributes
- Real-time analysis with confidence scores
- History of past predictions
- Responsive design for desktop and mobile

## Project Structure

```
bot-detection-tool/
├── backend/             # Flask API
│   ├── app.py           # Main application file
│   ├── model/           # Directory for saved models
│   ├── requirements.txt # Python dependencies
│   └── package.json     # npm scripts for convenience
├── frontend/            # React frontend
│   ├── public/          # Static files
│   ├── src/             # React source code
│   ├── package.json     # Frontend dependencies
│   └── README.md
└── README.md            # This file
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install flask pandas numpy scikit-learn joblib flask-cors
   ```

4. Prepare your training data:
   - Place your `training_data_2_csv_UTF.csv` file in the backend directory

5. Start the backend server:
   ```bash
   python app.py
   ```
   The server will run on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   The frontend will run on http://localhost:3000

## Usage

1. Open your browser and go to http://localhost:3000
2. Fill in the account information you want to analyze
3. Click the "Detect Bot" button
4. View the results showing whether the account is likely a bot or human
5. Previous predictions are displayed at the bottom of the results section

## API Endpoints

- `POST /api/predict`: Submit account data for bot detection
- `POST /api/train`: Retrain the model with new data
- `GET /api/health`: Health check endpoint

## Dependencies

### Backend
- Flask
- pandas
- numpy
- scikit-learn
- joblib
- flask-cors

### Frontend
- React
- CSS3

## License

This project is licensed under the MIT License.
