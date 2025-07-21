from flask import Flask, request, jsonify
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
import numpy as np
from datetime import datetime
from flask_cors import CORS
from sklearn.linear_model import LogisticRegression

# Combined Flask app for sales anomaly detection, forecasting, and customer segmentation
app = Flask(__name__)
CORS(app)  # This will allow all origins. For production, you can restrict it.

# --- Anomaly Detection Endpoint ---
@app.route('/anomalies', methods=['POST'])
def anomalies():
    # Expect JSON: { "sales": [ { "date": ..., "value": ... }, ... ] }
    data = request.json
    sales = data.get('sales', [])
    if not sales or len(sales) < 5:
        return jsonify([])
    df = pd.DataFrame(sales)
    X = df[['value']].values
    model = IsolationForest(contamination=0.15, random_state=42)
    preds = model.fit_predict(X)
    df['anomaly'] = preds == -1
    anomalies = df[df['anomaly']].to_dict(orient='records')
    return jsonify(anomalies)

# --- Sales Forecasting Endpoint ---
@app.route('/forecast', methods=['POST'])
def forecast():
    data = request.json
    months = data['months']
    sales = data['sales']
    periods = data.get('periods', 4)

    X = np.arange(len(months)).reshape(-1, 1)
    y = np.array(sales)
    model = LinearRegression().fit(X, y)
    future_X = np.arange(len(months), len(months) + periods).reshape(-1, 1)
    forecast = model.predict(future_X).tolist()
    last_month = datetime.strptime(months[-1], '%Y-%m')
    future_months = [
        (last_month + pd.DateOffset(months=i+1)).strftime('%Y-%m')
        for i in range(periods)
    ]
    return jsonify({
        "forecast_months": future_months,
        "forecast_sales": forecast
    })

# --- Customer Segmentation Endpoint ---
@app.route('/customer_segments', methods=['POST'])
def customer_segments():
    # Expect JSON: { "customers": [{ "name": ..., "total": ..., "count": ..., "last_purchase": ... }, ...] }
    data = request.json
    customers = data['customers']
    if not customers or len(customers) < 2:
        return jsonify([])
    df = pd.DataFrame(customers)
    df['recency'] = (pd.Timestamp.now(tz='UTC') - pd.to_datetime(df['last_purchase'], utc=True)).dt.days
    features = df[['total', 'count', 'recency']].fillna(0)
    n_clusters = min(3, len(df))
    try:
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        df['segment'] = kmeans.fit_predict(features)
    except Exception as e:
        return jsonify([])
    centers = kmeans.cluster_centers_
    vip_idx = np.argmax(centers[:, 0] + centers[:, 1] - centers[:, 2])
    at_risk_idx = np.argmax(centers[:, 2])
    freq_idx = [i for i in range(n_clusters) if i not in [vip_idx, at_risk_idx]]
    seg_map = {vip_idx: 'VIP', at_risk_idx: 'At-Risk'}
    if freq_idx:
        seg_map[freq_idx[0]] = 'Frequent'
    df['segment_label'] = df['segment'].map(seg_map)
    try:
        reg = LinearRegression().fit(df[['count']], df['total'])
        df['clv'] = reg.predict(df[['count']])
    except Exception as e:
        df['clv'] = df['total']
    df['churn_risk'] = (df['recency'] > df['recency'].median()).astype(int)
    result = df[['name', 'total', 'count', 'last_purchase', 'segment_label', 'clv', 'churn_risk']].to_dict(orient='records')
    return jsonify(result)

@app.route('/churn_prediction', methods=['POST'])
def churn_prediction():
    # Expect JSON: { "customers": [{ "name": ..., "total": ..., "count": ..., "last_purchase": ... }, ...] }
    data = request.json
    customers = data.get('customers', [])
    if not customers or len(customers) < 2:
        return jsonify([])
    df = pd.DataFrame(customers)
    # Feature engineering
    df['recency'] = (pd.Timestamp.now(tz='UTC') - pd.to_datetime(df['last_purchase'], utc=True)).dt.days
    df['frequency'] = df['count']
    df['monetary'] = df['total']
    # Generate churn label: churned if recency > 60 days
    df['churned'] = (df['recency'] > 60).astype(int)
    # Train/test split (here, train on all, predict on all for demo)
    X = df[['recency', 'frequency', 'monetary']].fillna(0)
    y = df['churned']
    # If all y are the same, fallback to rule-based
    if y.nunique() == 1:
        df['churn_risk'] = df['churned']
        df['churn_probability'] = y.astype(float)
    else:
        model = LogisticRegression()
        model.fit(X, y)
        df['churn_probability'] = model.predict_proba(X)[:, 1]
        df['churn_risk'] = (df['churn_probability'] > 0.5).astype(int)
    # Output
    result = df[['name', 'total', 'count', 'last_purchase', 'churn_probability', 'churn_risk']].to_dict(orient='records')
    return jsonify(result)

if __name__ == '__main__':
    # To run: python app.py
    # The app will be available at http://localhost:5000
    app.run(port=5000) 