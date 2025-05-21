from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
import joblib
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  

MODEL_PATH = 'model/bot_detector.joblib'

def load_and_prepare_data(filepath):
    df = pd.read_csv(filepath)
    id_column = None
    if 'id' in df.columns:
        id_column = df['id'].copy()
    
    columns_to_drop = [
        'id_str', 'screen_name', 'location', 'description', 'url',
        'created_at', 'lang', 'status', 'has_extended_profile', 'name'
    ]
    
    existing_columns = [col for col in columns_to_drop if col in df.columns]
    if existing_columns:
        df.drop(existing_columns, axis=1, inplace=True)
    
    for col in ['verified', 'default_profile', 'default_profile_image']:
        if col in df.columns:
            df[col] = LabelEncoder().fit_transform(df[col])
    
    return df, id_column

def train_model(train_file):
    df, _ = load_and_prepare_data(train_file)
    
    if 'id' in df.columns:
        df_features = df.drop('id', axis=1)
    else:
        df_features = df
    
    X = df_features.drop('bot', axis=1)
    y = df['bot']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
    
    model = DecisionTreeClassifier(criterion='entropy')
    model.fit(X_train, y_train)
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    joblib.dump(model, MODEL_PATH)
    return model

def get_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    else:
        return train_model("training_data_2_csv_UTF.csv")

@app.route('/api/predict', methods=['POST'])
def predict_bot():
    data = request.get_json()
    
    if not data or 'account_data' not in data:
        return jsonify({'error': 'No account data provided'}), 400
        
    try:
        account_data = data['account_data']
        df = pd.DataFrame([account_data])
        
        account_id = account_data.get('id', 'Unknown')
        
        if 'id' in df.columns:
            df = df.drop('id', axis=1)
            
        for col in ['verified', 'default_profile', 'default_profile_image']:
            if col in df.columns:
                df[col] = LabelEncoder().fit_transform(df[col])
        
        model = get_model()
        
        model_features = model.feature_names_in_
        missing_features = set(model_features) - set(df.columns)
        extra_features = set(df.columns) - set(model_features)
        
        for feature in missing_features:
            df[feature] = 0
            
        if extra_features:
            df = df.drop(list(extra_features), axis=1)
            
        df = df[model_features]
        
        prediction = model.predict(df)[0]
        
        
        try:
            probability = model.predict_proba(df)[0].tolist()
        except:
            probability = [0.5, 0.5]  
        
        return jsonify({
            'account_id': account_id,
            'is_bot': bool(prediction),
            'confidence': max(probability),
            'probability': probability
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train_endpoint():
    try:
        train_model("training_data_2_csv_UTF.csv")
        return jsonify({'success': True, 'message': 'Model trained successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    get_model()
    app.run(debug=True, host='0.0.0.0', port=5000)