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
import os
from sqlalchemy import create_engine, text
import spacy
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import pickle
import json
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenAI API key setup
openai.api_key = os.getenv('OPENAI_API_KEY', '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')

# Combined Flask app for sales anomaly detection, forecasting, and customer segmentation
app = Flask(__name__)
CORS(app)  # This will allow all origins. For production, you can restrict it.

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL', "postgresql://postgres:10028Mike.@localhost:5432/saas_platform")
engine = create_engine(DATABASE_URL)

# Download NLTK data if not present
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# Load spaCy model
try:
    nlp = spacy.load('en_core_web_sm')
except OSError:
    # If model not found, download it
    import subprocess
    subprocess.run(['python', '-m', 'spacy', 'download', 'en_core_web_sm'])
    nlp = spacy.load('en_core_web_sm')

# Global variables for trained models
tenant_models = {}

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
        # Use OpenAI GPT-3.5-turbo for better summary generation
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a business analyst providing concise, professional summaries of business metrics."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        summary = response.choices[0].message.content.strip()
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

# --- New AI Learning Endpoints ---

def get_tenant_data(tenant_id, branch_id=None):
    """Fetch tenant-specific data from database"""
    try:
        # Sales data
        sales_query = text("""
            SELECT s.id, s.total, s."createdAt", s."customerName",
                   si."productId", si.quantity, si.price, p.name as product_name
            FROM "Sale" s
            LEFT JOIN "SaleItem" si ON s.id = si."saleId"
            LEFT JOIN "Product" p ON si."productId" = p.id
            WHERE s."tenantId" = :tenant_id
        """)
        if branch_id:
            sales_query = text(sales_query.text + ' AND s."branchId" = :branch_id')

        sales_df = pd.read_sql(sales_query, engine, params={'tenant_id': tenant_id, 'branch_id': branch_id})

        # Products data
        products_query = text("""
            SELECT id, name, price, "minStock", quantity
            FROM "Product"
            WHERE "tenantId" = :tenant_id
        """)
        products_df = pd.read_sql(products_query, engine, params={'tenant_id': tenant_id})

        # Inventory data
        inventory_query = text("""
            SELECT i."productId", i.quantity, i."minStock", p.name
            FROM "Inventory" i
            JOIN "Product" p ON i."productId" = p.id
            WHERE i."tenantId" = :tenant_id
        """)
        if branch_id:
            inventory_query = text(inventory_query.text + ' AND i."branchId" = :branch_id')
        inventory_df = pd.read_sql(inventory_query, engine, params={'tenant_id': tenant_id, 'branch_id': branch_id})

        return {
            'sales': sales_df,
            'products': products_df,
            'inventory': inventory_df
        }
    except Exception as e:
        print(f"Error fetching tenant data: {e}")
        return None

@app.route('/fetch_tenant_data', methods=['POST'])
def fetch_tenant_data():
    """Endpoint to fetch tenant data for AI learning"""
    data = request.json
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    tenant_data = get_tenant_data(tenant_id, branch_id)
    if tenant_data is None:
        return jsonify({"error": "Failed to fetch data"}), 500

    # Convert to JSON serializable format
    response = {
        'sales': tenant_data['sales'].to_dict(orient='records'),
        'products': tenant_data['products'].to_dict(orient='records'),
        'inventory': tenant_data['inventory'].to_dict(orient='records')
    }
    return jsonify(response)

@app.route('/learn_from_data', methods=['POST'])
def learn_from_data():
    """Train ML models on tenant data"""
    data = request.json
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    tenant_data = get_tenant_data(tenant_id, branch_id)
    if tenant_data is None:
        return jsonify({"error": "Failed to fetch data"}), 500

    try:
        # Train sales forecasting model
        sales_df = tenant_data['sales']
        if len(sales_df) > 10:
            sales_df['date'] = pd.to_datetime(sales_df['createdAt'])
            monthly_sales = sales_df.groupby(pd.Grouper(key='date', freq='M'))['total'].sum().reset_index()
            monthly_sales['month_num'] = (monthly_sales['date'].dt.year - monthly_sales['date'].dt.year.min()) * 12 + monthly_sales['date'].dt.month

            X = monthly_sales[['month_num']].values
            y = monthly_sales['total'].values

            forecast_model = LinearRegression()
            forecast_model.fit(X, y)

            # Store model
            tenant_models[f"{tenant_id}_forecast"] = forecast_model
        else:
            return jsonify({"error": "Insufficient sales data for training"}), 400

        # Train product recommendation model (simple frequency-based)
        product_freq = sales_df.groupby('product_name')['quantity'].sum().sort_values(ascending=False)
        tenant_models[f"{tenant_id}_products"] = product_freq.to_dict()

        # Train customer behavior model
        customer_df = sales_df.groupby('customerName').agg({
            'total': 'sum',
            'id': 'count',
            'createdAt': 'max'
        }).reset_index()
        customer_df.columns = ['name', 'total', 'count', 'last_purchase']
        customer_df['recency'] = (pd.Timestamp.now() - pd.to_datetime(customer_df['last_purchase'])).dt.days

        if len(customer_df) > 5:
            features = customer_df[['total', 'count', 'recency']].fillna(0)
            kmeans = KMeans(n_clusters=min(3, len(customer_df)), random_state=42, n_init=10)
            customer_df['segment'] = kmeans.fit_predict(features)
            tenant_models[f"{tenant_id}_customers"] = {
                'model': kmeans,
                'data': customer_df.to_dict(orient='records')
            }

        return jsonify({"message": "Models trained successfully", "models": list(tenant_models.keys())})

    except Exception as e:
        return jsonify({"error": f"Training failed: {str(e)}"}), 500

@app.route('/analyze_query', methods=['POST'])
def analyze_query():
    """Analyze user query using NLP"""
    data = request.json
    query = data.get('query', '')

    if not query:
        return jsonify({"error": "query is required"}), 400

    try:
        # Tokenize and remove stopwords
        tokens = word_tokenize(query.lower())
        stop_words = set(stopwords.words('english'))
        filtered_tokens = [word for word in tokens if word.isalnum() and word not in stop_words]

        # Use spaCy for entity recognition
        doc = nlp(query)
        entities = [(ent.text, ent.label_) for ent in doc.ents]

        # Enhanced intent classification for diverse queries
        intent = 'general'
        confidence = 0.8

        # Business information queries
        if any(word in filtered_tokens for word in ['owner', 'business', 'company', 'tenant', 'contact', 'email', 'phone']):
            intent = 'business_info'
            confidence = 0.9
        elif any(word in filtered_tokens for word in ['branch', 'location', 'store', 'address']):
            intent = 'branch_info'
            confidence = 0.9

        # Inventory and product queries
        elif any(word in filtered_tokens for word in ['inventory', 'stock', 'quantity', 'low', 'out', 'available']):
            intent = 'inventory_status'
            confidence = 0.9
        elif any(word in filtered_tokens for word in ['product', 'item', 'goods', 'supply']):
            if any(word in filtered_tokens for word in ['best', 'top', 'performing', 'highest']):
                intent = 'performance_analysis'
            else:
                intent = 'product_info'
            confidence = 0.8

        # Customer and supplier queries
        elif any(word in filtered_tokens for word in ['customer', 'client', 'buyer']):
            if any(word in filtered_tokens for word in ['segment', 'churn', 'retention']):
                intent = 'customer_analysis'
            elif any(word in filtered_tokens for word in ['top', 'best', 'highest']):
                intent = 'top_customers'
            else:
                intent = 'customer_info'
            confidence = 0.9
        elif any(word in filtered_tokens for word in ['supplier', 'vendor', 'provider']):
            intent = 'supplier_info'
            confidence = 0.8

        # Sales and performance queries
        elif any(word in filtered_tokens for word in ['best', 'top', 'performing', 'highest']):
            intent = 'performance_analysis'
            confidence = 0.9
        elif any(word in filtered_tokens for word in ['sales', 'revenue', 'forecast', 'trend']):
            intent = 'sales_analysis'
            confidence = 0.9

        # Operational queries
        elif any(word in filtered_tokens for word in ['user', 'employee', 'staff', 'role']):
            intent = 'user_info'
            confidence = 0.8
        elif any(word in filtered_tokens for word in ['status', 'health', 'system', 'overview']):
            intent = 'system_status'
            confidence = 0.8

        return jsonify({
            "tokens": filtered_tokens,
            "entities": entities,
            "intent": intent,
            "confidence": confidence
        })

    except Exception as e:
        return jsonify({"error": f"NLP analysis failed: {str(e)}"}), 500

@app.route('/personalized_insights', methods=['POST'])
def personalized_insights():
    """Generate personalized insights using trained models"""
    data = request.json
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')
    user_history = data.get('user_history', [])

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    insights = []

    try:
        # Check for trained models
        forecast_key = f"{tenant_id}_forecast"
        if forecast_key in tenant_models:
            # Generate forecast insight
            model = tenant_models[forecast_key]
            # Predict next month (simplified)
            next_month = len(model.coef_) + 1  # Placeholder
            prediction = model.predict([[next_month]])[0]
            insights.append(f"Based on your sales trends, next month's revenue is predicted to be Ksh {prediction:,.0f}")

        product_key = f"{tenant_id}_products"
        if product_key in tenant_models:
            top_products = list(tenant_models[product_key].keys())[:3]
            insights.append(f"Your best-selling products are: {', '.join(top_products)}")

        customer_key = f"{tenant_id}_customers"
        if customer_key in tenant_models:
            customer_data = tenant_models[customer_key]['data']
            vip_count = sum(1 for c in customer_data if c.get('segment') == 0)  # Assuming segment 0 is VIP
            insights.append(f"You have {vip_count} VIP customers who contribute significantly to revenue")

        # Analyze user history for personalization
        if user_history:
            query_types = {}
            for interaction in user_history[-10:]:  # Last 10 interactions
                query = interaction.get('userMessage', '').lower()
                if 'sales' in query or 'revenue' in query:
                    query_types['sales'] = query_types.get('sales', 0) + 1
                elif 'product' in query or 'inventory' in query:
                    query_types['products'] = query_types.get('products', 0) + 1
                elif 'customer' in query:
                    query_types['customers'] = query_types.get('customers', 0) + 1

            most_common = max(query_types, key=query_types.get) if query_types else 'general'
            if most_common == 'sales':
                insights.append("Since you frequently ask about sales, I've prepared additional revenue insights")
            elif most_common == 'products':
                insights.append("You seem interested in products - check out our inventory recommendations")
            elif most_common == 'customers':
                insights.append("Customer analytics show interesting patterns in your data")

        return jsonify({"insights": insights})

    except Exception as e:
        return jsonify({"error": f"Failed to generate insights: {str(e)}"}), 500

# --- New Diverse Data Endpoints ---

@app.route('/get_business_info', methods=['POST'])
def get_business_info():
    """Fetch business/tenant information"""
    data = request.json
    tenant_id = data.get('tenant_id')

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    try:
        tenant_query = text("""
            SELECT name, businessType, contactEmail, contactPhone, address, city, country,
                   website, businessDescription, foundedYear, employeeCount
            FROM "Tenant"
            WHERE id = :tenant_id
        """)
        tenant_df = pd.read_sql(tenant_query, engine, params={'tenant_id': tenant_id})

        if tenant_df.empty:
            return jsonify({"error": "Tenant not found"}), 404

        tenant_info = tenant_df.iloc[0].to_dict()

        # Get owner info (assuming first user or specific role)
        owner_query = text("""
            SELECT u.name, u.email, u.phone
            FROM "User" u
            JOIN "UserRole" ur ON u.id = ur.userId
            JOIN "Role" r ON ur.roleId = r.id
            WHERE u.tenantId = :tenant_id AND r.name ILIKE '%owner%'
            LIMIT 1
        """)
        owner_df = pd.read_sql(owner_query, engine, params={'tenant_id': tenant_id})
        owner_info = owner_df.iloc[0].to_dict() if not owner_df.empty else None

        return jsonify({
            "business_info": tenant_info,
            "owner_info": owner_info
        })

    except Exception as e:
        return jsonify({"error": f"Failed to fetch business info: {str(e)}"}), 500

@app.route('/get_branch_info', methods=['POST'])
def get_branch_info():
    """Fetch branch information"""
    data = request.json
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    try:
        branch_query = text("""
            SELECT id, name, address, city, country, phone, email, isMainBranch, status
            FROM "Branch"
            WHERE tenantId = :tenant_id
        """)
        if branch_id:
            branch_query = text(branch_query.text + ' AND id = :branch_id')

        branch_df = pd.read_sql(branch_query, engine, params={'tenant_id': tenant_id, 'branch_id': branch_id})
        branches = branch_df.to_dict(orient='records')

        return jsonify({"branches": branches})

    except Exception as e:
        return jsonify({"error": f"Failed to fetch branch info: {str(e)}"}), 500

@app.route('/get_inventory_status', methods=['POST'])
def get_inventory_status():
    """Fetch current inventory status"""
    data = request.json
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    try:
        inventory_query = text("""
            SELECT p.name, i.quantity, i.minStock, i.maxStock,
                   CASE WHEN i.quantity <= i.minStock THEN 'Low Stock'
                        WHEN i.quantity = 0 THEN 'Out of Stock'
                        WHEN i.quantity > i.maxStock THEN 'Over Stock'
                        ELSE 'Normal' END as status
            FROM "Inventory" i
            JOIN "Product" p ON i.productId = p.id
            WHERE i.tenantId = :tenant_id
        """)
        if branch_id:
            inventory_query = text(inventory_query.text + ' AND i.branchId = :branch_id')

        inventory_df = pd.read_sql(inventory_query, engine, params={'tenant_id': tenant_id, 'branch_id': branch_id})
        inventory = inventory_df.to_dict(orient='records')

        # Summary stats
        low_stock_count = sum(1 for item in inventory if item['status'] == 'Low Stock')
        out_of_stock_count = sum(1 for item in inventory if item['status'] == 'Out of Stock')

        return jsonify({
            "inventory": inventory,
            "summary": {
                "total_items": len(inventory),
                "low_stock": low_stock_count,
                "out_of_stock": out_of_stock_count
            }
        })

    except Exception as e:
        return jsonify({"error": f"Failed to fetch inventory status: {str(e)}"}), 500

@app.route('/get_customer_insights', methods=['POST'])
def get_customer_insights():
    """Fetch customer analytics and insights"""
    data = request.json
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    try:
        # Top customers by revenue
        top_customers_query = text("""
            SELECT "customerName", SUM(total) as total_revenue, COUNT(*) as purchase_count
            FROM "Sale"
            WHERE "tenantId" = :tenant_id AND "customerName" IS NOT NULL
            GROUP BY "customerName"
            ORDER BY total_revenue DESC
            LIMIT 10
        """)
        if branch_id:
            top_customers_query = text(top_customers_query.text.replace('WHERE', 'WHERE "branchId" = :branch_id AND'))

        top_customers_df = pd.read_sql(top_customers_query, engine, params={'tenant_id': tenant_id, 'branch_id': branch_id})
        top_customers = top_customers_df.to_dict(orient='records')

        # Customer retention (simplified - customers with purchases in last 30 days)
        retention_query = text("""
            SELECT COUNT(DISTINCT "customerName") as active_customers
            FROM "Sale"
            WHERE "tenantId" = :tenant_id AND "customerName" IS NOT NULL
            AND "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        """)
        if branch_id:
            retention_query = text(retention_query.text + ' AND "branchId" = :branch_id')

        retention_df = pd.read_sql(retention_query, engine, params={'tenant_id': tenant_id, 'branch_id': branch_id})
        active_customers = retention_df.iloc[0]['active_customers'] if not retention_df.empty else 0

        return jsonify({
            "top_customers": top_customers,
            "active_customers_last_30_days": active_customers,
            "insights": [
                f"You have {len(top_customers)} top customers contributing significantly to revenue",
                f"{active_customers} customers were active in the last 30 days"
            ]
        })

    except Exception as e:
        return jsonify({"error": f"Failed to fetch customer insights: {str(e)}"}), 500

@app.route('/get_operational_data', methods=['POST'])
def get_operational_data():
    """Fetch operational data and system status"""
    data = request.json
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    try:
        # Recent sales summary
        sales_summary_query = text("""
            SELECT COUNT(*) as total_sales, SUM(total) as total_revenue,
                   AVG(total) as avg_sale_value, MAX(total) as highest_sale
            FROM "Sale"
            WHERE "tenantId" = :tenant_id
            AND "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        """)
        if branch_id:
            sales_summary_query = text(sales_summary_query.text + ' AND "branchId" = :branch_id')

        sales_df = pd.read_sql(sales_summary_query, engine, params={'tenant_id': tenant_id, 'branch_id': branch_id})
        sales_summary = sales_df.iloc[0].to_dict() if not sales_df.empty else {}

        # User activity
        user_query = text("""
            SELECT COUNT(*) as total_users,
                   COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users
            FROM "User"
            WHERE "tenantId" = :tenant_id
        """)
        user_df = pd.read_sql(user_query, engine, params={'tenant_id': tenant_id})
        user_summary = user_df.iloc[0].to_dict() if not user_df.empty else {}

        return jsonify({
            "sales_summary": sales_summary,
            "user_summary": user_summary,
            "system_status": "operational"
        })

    except Exception as e:
        return jsonify({"error": f"Failed to fetch operational data: {str(e)}"}), 500

@app.route('/update_inventory_stock', methods=['POST'])
def update_inventory_stock():
    """Update stock quantity for a specific product"""
    data = request.json
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')
    product_id = data.get('product_id')
    product_name = data.get('product_name')
    quantity_to_add = data.get('quantity_to_add', 0)

    if not tenant_id or (not product_id and not product_name) or quantity_to_add <= 0:
        return jsonify({"error": "tenant_id, product identifier (id or name), and positive quantity_to_add are required"}), 400

    try:
        # Find product if name provided
        if product_name and not product_id:
            product_query = text("""
                SELECT id FROM "Product"
                WHERE "tenantId" = :tenant_id AND LOWER(name) = LOWER(:product_name)
                LIMIT 1
            """)
            product_df = pd.read_sql(product_query, engine, params={'tenant_id': tenant_id, 'product_name': product_name})
            if product_df.empty:
                return jsonify({"error": f"Product '{product_name}' not found"}), 404
            product_id = product_df.iloc[0]['id']

        # Update inventory
        update_query = text("""
            UPDATE "Inventory"
            SET quantity = quantity + :quantity_to_add, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "productId" = :product_id AND "tenantId" = :tenant_id
        """)
        if branch_id:
            update_query = text(update_query.text + ' AND "branchId" = :branch_id')

        params = {'product_id': product_id, 'tenant_id': tenant_id, 'quantity_to_add': quantity_to_add}
        if branch_id:
            params['branch_id'] = branch_id

        with engine.connect() as conn:
            result = conn.execute(update_query, params)
            conn.commit()

        if result.rowcount == 0:
            return jsonify({"error": "No inventory record found to update"}), 404

        # Get updated quantity
        check_query = text("""
            SELECT p.name, i.quantity
            FROM "Inventory" i
            JOIN "Product" p ON i."productId" = p.id
            WHERE i."productId" = :product_id AND i."tenantId" = :tenant_id
        """)
        if branch_id:
            check_query = text(check_query.text + ' AND i."branchId" = :branch_id')

        updated_df = pd.read_sql(check_query, engine, params={'product_id': product_id, 'tenant_id': tenant_id, 'branch_id': branch_id} if branch_id else {'product_id': product_id, 'tenant_id': tenant_id})

        if not updated_df.empty:
            product_name = updated_df.iloc[0]['name']
            new_quantity = updated_df.iloc[0]['quantity']

            return jsonify({
                "message": f"Successfully added {quantity_to_add} units to {product_name}",
                "product_name": product_name,
                "new_quantity": new_quantity,
                "quantity_added": quantity_to_add
            })
        else:
            return jsonify({"message": f"Stock updated successfully, added {quantity_to_add} units"})

    except Exception as e:
        return jsonify({"error": f"Failed to update inventory: {str(e)}"}), 500

# --- Dynamic Query Processing ---

@app.route('/process_dynamic_query', methods=['POST'])
def process_dynamic_query():
    """Process dynamic queries using AI and database access"""
    data = request.json
    query = data.get('query', '')
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')
    user_context = data.get('user_context', {})

    if not query or not tenant_id:
        return jsonify({"error": "query and tenant_id are required"}), 400

    try:
        # First, analyze the query using NLP
        nlp_analysis = analyze_query_nlp(query)

        # Generate SQL query based on the analysis
        sql_query, query_type = generate_dynamic_sql_query(query, nlp_analysis, tenant_id, branch_id)

        if not sql_query:
            return jsonify({"response": "I'm sorry, I couldn't understand how to query the database for that information. Could you rephrase your question?"})

        # Execute the query
        result_df = pd.read_sql(sql_query, engine)

        # Generate human-readable response
        response = generate_response_from_query_results(result_df, query_type, query)

        # Add insights if available
        insights = generate_insights_from_results(result_df, query_type)

        return jsonify({
            "response": response,
            "insights": insights,
            "query_type": query_type,
            "data_summary": {
                "rows_returned": len(result_df),
                "columns": list(result_df.columns)
            }
        })

    except Exception as e:
        print(f"Error processing dynamic query: {e}")
        return jsonify({"response": "I encountered an error while processing your query. Please try again or contact support if the issue persists."})

def analyze_query_nlp(query):
    """Analyze query using NLP to understand intent and entities"""
    try:
        # Tokenize and remove stopwords
        tokens = word_tokenize(query.lower())
        stop_words = set(stopwords.words('english'))
        filtered_tokens = [word for word in tokens if word.isalnum() and word not in stop_words]

        # Use spaCy for entity recognition
        doc = nlp(query)
        entities = [(ent.text, ent.label_) for ent in doc.ents]

        # Enhanced intent classification
        intent_keywords = {
            'sales': ['sale', 'sales', 'revenue', 'transaction', 'purchase', 'buy', 'sold'],
            'products': ['product', 'item', 'inventory', 'stock', 'goods', 'supply'],
            'customers': ['customer', 'client', 'buyer', 'user', 'person'],
            'branches': ['branch', 'location', 'store', 'office', 'shop'],
            'users': ['user', 'employee', 'staff', 'worker', 'personnel'],
            'analytics': ['analytics', 'analysis', 'report', 'summary', 'trend', 'performance'],
            'business': ['business', 'company', 'tenant', 'organization', 'firm']
        }

        intent_scores = {}
        for intent, keywords in intent_keywords.items():
            score = sum(1 for token in filtered_tokens if any(kw in token for kw in keywords))
            if score > 0:
                intent_scores[intent] = score

        primary_intent = max(intent_scores.items(), key=lambda x: x[1])[0] if intent_scores else 'general'

        # Extract time-related information
        time_keywords = ['today', 'yesterday', 'week', 'month', 'year', 'last', 'recent', 'current']
        time_context = [token for token in filtered_tokens if any(kw in token for kw in time_keywords)]

        # Extract aggregation keywords
        agg_keywords = ['total', 'sum', 'count', 'average', 'avg', 'max', 'min', 'top', 'best', 'highest', 'lowest']
        aggregation = [token for token in filtered_tokens if any(kw in token for kw in agg_keywords)]

        return {
            'tokens': filtered_tokens,
            'entities': entities,
            'primary_intent': primary_intent,
            'intent_scores': intent_scores,
            'time_context': time_context,
            'aggregation': aggregation
        }

    except Exception as e:
        print(f"NLP analysis error: {e}")
        return {
            'tokens': [],
            'entities': [],
            'primary_intent': 'general',
            'intent_scores': {},
            'time_context': [],
            'aggregation': []
        }

def generate_dynamic_sql_query(query, nlp_analysis, tenant_id, branch_id):
    """Generate SQL query based on NLP analysis"""
    intent = nlp_analysis['primary_intent']
    tokens = nlp_analysis['tokens']
    time_context = nlp_analysis['time_context']
    aggregation = nlp_analysis['aggregation']

    base_conditions = f'WHERE "tenantId" = \'{tenant_id}\''
    if branch_id:
        base_conditions += f' AND "branchId" = \'{branch_id}\''

    # Time filtering
    time_filter = ""
    if time_context:
        if 'today' in time_context or 'current' in time_context:
            time_filter = ' AND DATE("createdAt") = CURRENT_DATE'
        elif 'yesterday' in time_context:
            time_filter = ' AND DATE("createdAt") = CURRENT_DATE - INTERVAL \'1 day\''
        elif 'week' in time_context or 'last' in ' '.join(tokens):
            time_filter = ' AND "createdAt" >= CURRENT_DATE - INTERVAL \'7 days\''
        elif 'month' in time_context:
            time_filter = ' AND "createdAt" >= CURRENT_DATE - INTERVAL \'30 days\''
        elif 'year' in time_context:
            time_filter = ' AND "createdAt" >= CURRENT_DATE - INTERVAL \'365 days\''

    try:
        if intent == 'sales':
            if 'total' in aggregation or 'sum' in aggregation:
                sql = f'SELECT SUM(total) as total_revenue, COUNT(*) as total_sales FROM "Sale" {base_conditions}{time_filter}'
                return sql, 'sales_summary'
            elif 'average' in aggregation or 'avg' in aggregation:
                sql = f'SELECT AVG(total) as avg_sale, COUNT(*) as total_sales FROM "Sale" {base_conditions}{time_filter}'
                return sql, 'sales_average'
            else:
                sql = f'SELECT id, total, "customerName", "createdAt" FROM "Sale" {base_conditions}{time_filter} ORDER BY "createdAt" DESC LIMIT 20'
                return sql, 'sales_list'

        elif intent == 'products':
            if 'top' in tokens or 'best' in tokens or 'highest' in tokens:
                sql = '''
                    SELECT p.name, SUM(si.quantity) as total_quantity, SUM(si.quantity * si.price) as total_revenue
                    FROM "SaleItem" si
                    JOIN "Product" p ON si."productId" = p.id
                    JOIN "Sale" s ON si."saleId" = s.id
                    {base_conditions}{time_filter}
                    GROUP BY p.name
                    ORDER BY total_revenue DESC
                    LIMIT 10
                '''.format(base_conditions=base_conditions, time_filter=time_filter)
                return sql, 'top_products'
            else:
                sql = f'SELECT p.name, i.quantity, i."minStock", p.price FROM "Inventory" i JOIN "Product" p ON i."productId" = p.id {base_conditions}'
                return sql, 'inventory_status'

        elif intent == 'customers':
            if 'top' in tokens or 'best' in tokens:
                sql = f'SELECT "customerName", SUM(total) as total_revenue, COUNT(*) as purchase_count FROM "Sale" {base_conditions} AND "customerName" IS NOT NULL {time_filter} GROUP BY "customerName" ORDER BY total_revenue DESC LIMIT 10'
                return sql, 'top_customers'
            else:
                sql = f'SELECT DISTINCT "customerName", COUNT(*) as purchase_count, SUM(total) as total_spent FROM "Sale" {base_conditions} AND "customerName" IS NOT NULL GROUP BY "customerName" ORDER BY total_spent DESC LIMIT 20'
                return sql, 'customer_list'

        elif intent == 'branches':
            sql = f'SELECT id, name, address, city, country, phone, email FROM "Branch" WHERE "tenantId" = \'{tenant_id}\''
            return sql, 'branch_list'

        elif intent == 'users':
            sql = f'SELECT name, email, "createdAt" FROM "User" WHERE "tenantId" = \'{tenant_id}\' ORDER BY "createdAt" DESC LIMIT 20'
            return sql, 'user_list'

        elif intent == 'business':
            sql = f'SELECT name, businessType, contactEmail, contactPhone, address, city, country FROM "Tenant" WHERE id = \'{tenant_id}\''
            return sql, 'business_info'

        else:
            # Try to find relevant data based on keywords
            if any(word in ' '.join(tokens) for word in ['how many', 'count', 'number']):
                # Count queries
                if 'sale' in tokens or 'sales' in tokens:
                    sql = f'SELECT COUNT(*) as count FROM "Sale" {base_conditions}{time_filter}'
                    return sql, 'count_sales'
                elif 'product' in tokens:
                    sql = f'SELECT COUNT(*) as count FROM "Product" WHERE "tenantId" = \'{tenant_id}\''
                    return sql, 'count_products'
                elif 'customer' in tokens:
                    sql = f'SELECT COUNT(DISTINCT "customerName") as count FROM "Sale" {base_conditions} AND "customerName" IS NOT NULL'
                    return sql, 'count_customers'

            # Default fallback - try sales data
            sql = f'SELECT COUNT(*) as total_records FROM "Sale" {base_conditions}{time_filter}'
            return sql, 'general_count'

    except Exception as e:
        print(f"SQL generation error: {e}")
        return None, None

def generate_response_from_query_results(df, query_type, original_query):
    """Generate human-readable response from query results"""
    try:
        if df.empty:
            return "I couldn't find any data matching your query. Please try rephrasing or check if the data exists."

        if query_type == 'sales_summary':
            total_revenue = df.iloc[0]['total_revenue'] or 0
            total_sales = df.iloc[0]['total_sales'] or 0
            avg_sale = total_revenue / total_sales if total_sales > 0 else 0

            response = f"📊 **Sales Summary**\n\n"
            response += f"💰 **Total Revenue:** Ksh {total_revenue:,.0f}\n"
            response += f"🛒 **Total Transactions:** {total_sales:,}\n"
            response += f"📈 **Average Sale Value:** Ksh {avg_sale:,.0f}\n\n"

            # Add insights
            if total_sales > 0:
                response += f"💡 **Insights:**\n"
                response += f"• Daily average: ~{total_sales//30} transactions\n"
                response += f"• Revenue per transaction shows {'strong' if avg_sale > 5000 else 'moderate' if avg_sale > 2000 else 'basic'} pricing strategy\n"

            return response

        elif query_type == 'sales_average':
            avg_sale = df.iloc[0]['avg_sale'] or 0
            total_sales = df.iloc[0]['total_sales'] or 0

            response = f"📊 **Sales Performance Analysis**\n\n"
            response += f"📈 **Average Transaction Value:** Ksh {avg_sale:,.0f}\n"
            response += f"🛒 **Total Transactions Analyzed:** {total_sales:,}\n\n"

            response += f"💡 **Performance Insights:**\n"
            if avg_sale > 10000:
                response += f"• Premium pricing strategy with high-value transactions\n"
            elif avg_sale > 5000:
                response += f"• Strong mid-range pricing with good profit margins\n"
            elif avg_sale > 2000:
                response += f"• Competitive pricing attracting volume sales\n"
            else:
                response += f"• Value-driven approach focusing on accessibility\n"

            return response

        elif query_type == 'sales_list':
            sales_count = len(df)
            total_value = df['total'].sum()
            avg_sale = total_value / sales_count if sales_count > 0 else 0

            response = f"📋 **Recent Sales Transactions**\n\n"
            response += f"🛒 **Total Transactions:** {sales_count:,}\n"
            response += f"💰 **Total Value:** Ksh {total_value:,.0f}\n"
            response += f"📊 **Average Sale:** Ksh {avg_sale:,.0f}\n\n"

            # Show top transactions
            if len(df) > 0:
                response += f"🏆 **Top Transactions:**\n"
                top_sales = df.nlargest(5, 'total')[['customerName', 'total', 'createdAt']].head(5)
                for idx, sale in top_sales.iterrows():
                    customer = sale['customerName'] or 'Walk-in Customer'
                    date = pd.to_datetime(sale['createdAt']).strftime('%b %d, %Y')
                    response += f"• {customer}: Ksh {sale['total']:,.0f} ({date})\n"

            return response

        elif query_type == 'top_products':
            if len(df) > 0:
                response = f"🏆 **Top Performing Products**\n\n"

                # Overall stats
                total_revenue = df['total_revenue'].sum()
                total_quantity = df['total_quantity'].sum()

                response += f"📊 **Overall Performance:**\n"
                response += f"• Total Revenue: Ksh {total_revenue:,.0f}\n"
                response += f"• Total Units Sold: {total_quantity:,}\n"
                response += f"• Products Tracked: {len(df)}\n\n"

                # Top products detailed
                response += f"🥇 **Top Products by Revenue:**\n\n"
                for i, (_, product) in enumerate(df.head(10).iterrows(), 1):
                    medal = {1: '🥇', 2: '🥈', 3: '🥉'}.get(i, f"{i}.")
                    revenue = product['total_revenue'] or 0
                    quantity = product['total_quantity'] or 0
                    revenue_pct = (revenue / total_revenue * 100) if total_revenue > 0 else 0

                    response += f"{medal} **{product['name']}**\n"
                    response += f"   💰 Revenue: Ksh {revenue:,.0f} ({revenue_pct:.1f}% of total)\n"
                    response += f"   📦 Units Sold: {quantity:,}\n"
                    response += f"   📈 Avg Price: Ksh {revenue/quantity:,.0f} per unit\n\n"

                # Insights
                top_product_revenue = df.iloc[0]['total_revenue'] or 0
                concentration = (top_product_revenue / total_revenue * 100) if total_revenue > 0 else 0

                response += f"💡 **Key Insights:**\n"
                response += f"• Your top product generates {concentration:.1f}% of total product revenue\n"
                response += f"• Revenue concentration: {'High' if concentration > 50 else 'Moderate' if concentration > 25 else 'Well-distributed'}\n"
                response += f"• Best-selling product: {df.iloc[0]['name']}\n"

                return response
            else:
                return "📭 **No Product Sales Data Found**\n\nI couldn't find any product sales data. This might be because:\n• No sales have been recorded yet\n• Products haven't been properly categorized\n• Data might be in a different format\n\nTry checking your sales records or contact support for assistance."

        elif query_type == 'inventory_status':
            total_products = len(df)
            low_stock = len(df[df['quantity'] <= df['minStock']])
            out_of_stock = len(df[df['quantity'] == 0])
            total_value = df['quantity'].sum()

            response = f"📦 **Inventory Status Overview**\n\n"
            response += f"📊 **Summary:**\n"
            response += f"• Total Products: {total_products:,}\n"
            response += f"• Low Stock Items: {low_stock:,}\n"
            response += f"• Out of Stock Items: {out_of_stock:,}\n"
            response += f"• Total Units in Stock: {total_value:,}\n\n"

            # Stock levels breakdown
            response += f"📈 **Stock Level Breakdown:**\n"
            normal_stock = total_products - low_stock - out_of_stock
            response += f"• Well Stocked: {normal_stock} items\n"
            response += f"• Low Stock: {low_stock} items\n"
            response += f"• Out of Stock: {out_of_stock} items\n\n"

            # Critical items
            if low_stock > 0:
                response += f"⚠️ **Items Needing Attention:**\n"
                critical_items = df[df['quantity'] <= df['minStock']].head(5)
                for _, item in critical_items.iterrows():
                    status = "OUT OF STOCK" if item['quantity'] == 0 else f"LOW ({item['quantity']} units)"
                    response += f"• {item['name']}: {status}\n"
                response += "\n"

            # Insights
            response += f"💡 **Inventory Insights:**\n"
            healthy_ratio = (normal_stock / total_products * 100) if total_products > 0 else 0
            response += f"• Inventory Health: {'Excellent' if healthy_ratio > 80 else 'Good' if healthy_ratio > 60 else 'Needs Attention'} ({healthy_ratio:.1f}% well-stocked)\n"

            if low_stock > total_products * 0.2:
                response += f"• Consider reviewing your reorder policies\n"
            if out_of_stock > 0:
                response += f"• {out_of_stock} products are unavailable - consider emergency restocking\n"

            return response

        elif query_type == 'top_customers':
            if len(df) > 0:
                response = f"👥 **Top Customers Analysis**\n\n"

                # Overall stats
                total_revenue = df['total_revenue'].sum()
                total_purchases = df['purchase_count'].sum()

                response += f"📊 **Customer Portfolio Summary:**\n"
                response += f"• Total Customers: {len(df):,}\n"
                response += f"• Total Revenue: Ksh {total_revenue:,.0f}\n"
                response += f"• Total Purchase Transactions: {total_purchases:,}\n"
                response += f"• Average Revenue per Customer: Ksh {total_revenue/len(df):,.0f}\n\n"

                # Top customers detailed
                response += f"🥇 **Top Customers by Revenue:**\n\n"
                for i, (_, customer) in enumerate(df.head(10).iterrows(), 1):
                    medal = {1: '🥇', 2: '🥈', 3: '🥉'}.get(i, f"{i}.")
                    revenue = customer['total_revenue'] or 0
                    purchases = customer['purchase_count'] or 0
                    revenue_pct = (revenue / total_revenue * 100) if total_revenue > 0 else 0
                    avg_order = revenue / purchases if purchases > 0 else 0

                    response += f"{medal} **{customer['customerName']}**\n"
                    response += f"   💰 Total Spent: Ksh {revenue:,.0f} ({revenue_pct:.1f}% of total)\n"
                    response += f"   🛒 Purchase Count: {purchases:,}\n"
                    response += f"   📈 Average Order Value: Ksh {avg_order:,.0f}\n\n"

                # Customer segmentation insights
                response += f"💡 **Customer Insights:**\n"
                top_customer_revenue = df.iloc[0]['total_revenue'] or 0
                concentration = (top_customer_revenue / total_revenue * 100) if total_revenue > 0 else 0

                response += f"• Revenue concentration: {'High' if concentration > 50 else 'Moderate' if concentration > 25 else 'Well-distributed'} ({concentration:.1f}% from top customer)\n"

                # Loyalty analysis
                avg_purchases = total_purchases / len(df)
                loyal_customers = len(df[df['purchase_count'] > avg_purchases])
                response += f"• Loyal customers (above avg purchases): {loyal_customers} ({loyal_customers/len(df)*100:.1f}%)\n"

                return response
            else:
                return "👥 **No Customer Data Found**\n\nI couldn't find customer purchase data. This might indicate:\n• No customer-specific sales recorded\n• All sales are walk-in transactions\n• Customer data needs to be properly categorized\n\nConsider implementing customer tracking for better insights."

        elif query_type == 'customer_list':
            customer_count = len(df)
            total_revenue = df['total_spent'].sum()
            avg_spent = total_revenue / customer_count if customer_count > 0 else 0
            avg_purchases = df['purchase_count'].mean()

            response = f"👥 **Customer Database Overview**\n\n"
            response += f"📊 **Summary Statistics:**\n"
            response += f"• Total Customers: {customer_count:,}\n"
            response += f"• Total Revenue Generated: Ksh {total_revenue:,.0f}\n"
            response += f"• Average Spent per Customer: Ksh {avg_spent:,.0f}\n"
            response += f"• Average Purchases per Customer: {avg_purchases:.1f}\n\n"

            # Customer distribution
            response += f"📈 **Customer Distribution:**\n"
            high_value = len(df[df['total_spent'] > avg_spent * 2])
            regular = len(df[(df['total_spent'] <= avg_spent * 2) & (df['total_spent'] > avg_spent * 0.5)])
            low_value = len(df[df['total_spent'] <= avg_spent * 0.5])

            response += f"• High-Value Customers: {high_value} (>{avg_spent*2:,.0f})\n"
            response += f"• Regular Customers: {regular}\n"
            response += f"• Low-Value Customers: {low_value}\n\n"

            # Top customers preview
            response += f"🏆 **Top 5 Customers:**\n"
            for i, (_, customer) in enumerate(df.head(5).iterrows(), 1):
                response += f"{i}. {customer['customerName']}: Ksh {customer['total_spent']:,.0f} ({customer['purchase_count']} purchases)\n"

            return response

        elif query_type == 'branch_list':
            branch_count = len(df)

            response = f"🏢 **Branch Network Overview**\n\n"
            response += f"📊 **Summary:**\n"
            response += f"• Total Branches: {branch_count}\n\n"

            response += f"🏪 **Branch Details:**\n\n"
            for i, (_, branch) in enumerate(df.iterrows(), 1):
                response += f"**{i}. {branch['name']}**\n"
                response += f"   📍 Address: {branch['address']}, {branch['city']}, {branch['country']}\n"
                if branch['phone']:
                    response += f"   📞 Phone: {branch['phone']}\n"
                if branch['email']:
                    response += f"   ✉️ Email: {branch['email']}\n"
                response += f"   🏷️ Status: {branch['status'] or 'Active'}\n"
                response += f"   ⭐ Main Branch: {'Yes' if branch['isMainBranch'] else 'No'}\n\n"

            return response

        elif query_type == 'user_list':
            user_count = len(df)

            response = f"👤 **User Management Overview**\n\n"
            response += f"📊 **Summary:**\n"
            response += f"• Total Users: {user_count}\n\n"

            response += f"👥 **Recent Users:**\n\n"
            for i, (_, user) in enumerate(df.iterrows(), 1):
                response += f"**{i}. {user['name']}**\n"
                response += f"   ✉️ Email: {user['email']}\n"
                response += f"   📅 Joined: {pd.to_datetime(user['createdAt']).strftime('%B %d, %Y')}\n\n"

            return response

        elif query_type == 'business_info':
            if len(df) > 0:
                business = df.iloc[0]

                response = f"🏢 **Business Profile**\n\n"
                response += f"**Business Name:** {business['name'] or 'Not specified'}\n"
                response += f"**Type:** {business['businessType'] or 'Not specified'}\n"
                response += f"**Contact Email:** {business['contactEmail'] or 'Not specified'}\n"
                response += f"**Contact Phone:** {business['contactPhone'] or 'Not specified'}\n"
                response += f"**Address:** {business['address'] or 'Not specified'}, {business['city'] or ''}, {business['country'] or ''}\n"

                if business['website']:
                    response += f"**Website:** {business['website']}\n"
                if business['foundedYear']:
                    response += f"**Founded:** {business['foundedYear']}\n"
                if business['employeeCount']:
                    response += f"**Employee Count:** {business['employeeCount']}\n"
                if business['businessDescription']:
                    response += f"**Description:** {business['businessDescription']}\n\n"

                response += f"💡 **Business Insights:**\n"
                response += f"• Established business with {'extensive' if business['employeeCount'] and business['employeeCount'] > 50 else 'growing'} operations\n"
                response += f"• {'Strong online presence' if business['website'] else 'Consider establishing online presence'}\n"

                return response
            else:
                return "🏢 **Business Information Not Found**\n\nUnable to retrieve business profile information. Please ensure your business details are properly configured."

        elif query_type in ['count_sales', 'count_products', 'count_customers', 'general_count']:
            count = df.iloc[0]['count'] or 0
            type_name = query_type.replace('count_', '').replace('_', ' ')

            response = f"📊 **Count Query Results**\n\n"
            response += f"🔢 **{type_name.title()}:** {count:,}\n\n"

            # Add context based on type
            if 'sales' in type_name:
                response += f"💡 **Context:** This represents the total number of sales transactions recorded.\n"
            elif 'products' in type_name:
                response += f"💡 **Context:** This represents the total number of products in your catalog.\n"
            elif 'customers' in type_name:
                response += f"💡 **Context:** This represents the total number of unique customers.\n"

            return response

        else:
            # Generic response with better formatting
            response = f"📋 **Query Results**\n\n"
            response += f"📊 **Records Found:** {len(df)}\n"
            response += f"📝 **Query:** {original_query}\n\n"

            if len(df) > 0:
                response += f"📄 **Available Data Columns:**\n"
                for col in df.columns[:5]:  # Show first 5 columns
                    response += f"• {col}\n"
                if len(df.columns) > 5:
                    response += f"• ... and {len(df.columns) - 5} more columns\n"

            return response

    except Exception as e:
        print(f"Response generation error: {e}")
        return "❌ **Response Generation Error**\n\nI processed your query but encountered an error formatting the response. Please try again or contact support if the issue persists."

def generate_insights_from_results(df, query_type):
    """Generate additional insights from query results"""
    insights = []

    try:
        if query_type == 'sales_summary' and len(df) > 0:
            total_revenue = df.iloc[0]['total_revenue'] or 0
            total_sales = df.iloc[0]['total_sales'] or 0
            if total_sales > 0:
                avg_sale = total_revenue / total_sales
                insights.append(f"Average transaction value: Ksh {avg_sale:,.0f}")

        elif query_type == 'top_products' and len(df) > 1:
            total_revenue = df['total_revenue'].sum()
            top_product_revenue = df.iloc[0]['total_revenue'] or 0
            concentration = (top_product_revenue / total_revenue) * 100 if total_revenue > 0 else 0
            insights.append(f"Your top product accounts for {concentration:.1f}% of total product revenue")

        elif query_type == 'inventory_status' and len(df) > 0:
            low_stock_count = len(df[df['quantity'] <= df['minStock']])
            if low_stock_count > 0:
                insights.append(f"Consider restocking {low_stock_count} products that are running low")

        elif query_type == 'top_customers' and len(df) > 1:
            total_revenue = df['total_revenue'].sum()
            top_customer_revenue = df.iloc[0]['total_revenue'] or 0
            concentration = (top_customer_revenue / total_revenue) * 100 if total_revenue > 0 else 0
            insights.append(f"Your top customer contributes {concentration:.1f}% of total revenue")

    except Exception as e:
        print(f"Insights generation error: {e}")

    return insights

# --- Enhanced ML Models ---

@app.route('/train_clv_model', methods=['POST'])
def train_clv_model():
    """Train Customer Lifetime Value prediction model"""
    data = request.json
    tenant_id = data.get('tenant_id')
    branch_id = data.get('branch_id')

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    try:
        # Get customer data
        customer_query = text("""
            SELECT "customerName", SUM(total) as total_revenue, COUNT(*) as purchase_count,
                   MAX("createdAt") as last_purchase, MIN("createdAt") as first_purchase
            FROM "Sale"
            WHERE "tenantId" = :tenant_id AND "customerName" IS NOT NULL
            GROUP BY "customerName"
            HAVING COUNT(*) > 1
        """)
        if branch_id:
            customer_query = text(customer_query.text + ' AND "branchId" = :branch_id')

        customer_df = pd.read_sql(customer_query, engine, params={'tenant_id': tenant_id, 'branch_id': branch_id})

        if len(customer_df) < 5:
            return jsonify({"error": "Insufficient customer data for CLV training"}), 400

        # Feature engineering
        customer_df['recency'] = (pd.Timestamp.now() - pd.to_datetime(customer_df['last_purchase'])).dt.days
        customer_df['frequency'] = customer_df['purchase_count']
        customer_df['monetary'] = customer_df['total_revenue']
        customer_df['tenure'] = (pd.to_datetime(customer_df['last_purchase']) - pd.to_datetime(customer_df['first_purchase'])).dt.days

        # Simple CLV prediction (monetary * frequency / recency)
        customer_df['predicted_clv'] = customer_df['monetary'] * customer_df['frequency'] / (customer_df['recency'] + 1)

        # Train regression model
        features = customer_df[['recency', 'frequency', 'monetary', 'tenure']].fillna(0)
        target = customer_df['predicted_clv']

        clv_model = LinearRegression()
        clv_model.fit(features, target)

        # Store model
        tenant_models[f"{tenant_id}_clv"] = {
            'model': clv_model,
            'feature_columns': ['recency', 'frequency', 'monetary', 'tenure']
        }

        return jsonify({"message": "CLV model trained successfully"})

    except Exception as e:
        return jsonify({"error": f"CLV training failed: {str(e)}"}), 500

if __name__ == '__main__':
    # To run: python app.py
    # The app will be available at http://localhost:5001
    app.run(port=5001)
