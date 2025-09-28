from flask import Flask, request, jsonify
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
import numpy as np
from datetime import datetime
from flask_cors import CORS
from sklearn.linear_model import LogisticRegression
from transformers import pipeline

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

# --- AI Summary Generation Endpoint ---
@app.route('/generate_summary', methods=['POST'])
def generate_summary():
    data = request.json
    metrics = data.get('metrics', {})
    if not metrics:
        return jsonify({"summary": "No data provided for summary generation."})

    # Create a text prompt from metrics
    prompt = f"""
    Generate a concise business report summary based on the following metrics:
    - Total Sales: {metrics.get('totalSales', 0)}
    - Total Revenue: Ksh {metrics.get('totalRevenue', 0):,.0f}
    - Average Sale Value: Ksh {metrics.get('avgSaleValue', 0):,.2f}
    - Top Products: {', '.join([p['name'] for p in metrics.get('topProducts', [])[:3]])}
    - Customer Retention: {metrics.get('customerRetention', {}).get('retentionRate', 0):.1f}%
    - Forecast Growth: {metrics.get('forecastGrowth', 0):.1f}%

    Provide a professional summary highlighting key insights and recommendations.
    """

    try:
        # Use a local text generation model (GPT-2 small)
        generator = pipeline('text-generation', model='gpt2')
        generated = generator(prompt, max_length=200, num_return_sequences=1, temperature=0.7)
        summary = generated[0]['generated_text'].strip()
        # Clean up the summary (remove the prompt if repeated)
        if summary.startswith(prompt.strip()):
            summary = summary[len(prompt.strip()):].strip()
        return jsonify({"summary": summary})
    except Exception as e:
        # Fallback to a simple template-based summary
        summary = f"""
        Business Performance Summary:
        - Sales performance shows {metrics.get('totalSales', 0)} total transactions with revenue of Ksh {metrics.get('totalRevenue', 0):,.0f}.
        - Average transaction value is Ksh {metrics.get('avgSaleValue', 0):,.2f}, indicating {'strong' if metrics.get('avgSaleValue', 0) > 1000 else 'moderate'} pricing strategy.
        - Top performing products include {', '.join([p['name'] for p in metrics.get('topProducts', [])[:3]])}.
        - Customer retention rate is {metrics.get('customerRetention', {}).get('retentionRate', 0):.1f}%, suggesting {'excellent' if metrics.get('customerRetention', {}).get('retentionRate', 0) > 80 else 'room for improvement'} in customer loyalty.
        - Forecast indicates {metrics.get('forecastGrowth', 0):.1f}% growth potential.

        Recommendations: Focus on high-margin products and improve customer retention through targeted marketing.
        """
        return jsonify({"summary": summary.strip()})

if __name__ == '__main__':
    # To run: python app.py
    # The app will be available at http://localhost:5001
    app.run(port=5001)
