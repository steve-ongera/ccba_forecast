# CCBA Demand Forecast — AI-Powered Demand Forecasting System

AI-powered demand forecasting platform for Coca-Cola Bottlers Africa beverage supply chain. Predicts product demand using historical sales + weather + holidays + events, trains ML models (Linear Regression, Random Forest, XGBoost), and surfaces forecasts via a React dashboard.

## Stack
- Backend: Django 5 + Django REST Framework, single core app
- ML: scikit-learn, pandas, numpy, xgboost (Celery task or management command driven training)
- DB: PostgreSQL
- Frontend: React + Vite, Bootstrap Icons, custom CSS design system (`main_ccba.css`)
- Auth: JWT (SimpleJWT), role-based (Admin, Analyst, Manager)

## Project Structure

```
ccba_forecast/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── ccba_forecast/                 # project (main urls/settings)
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   └── core/                          # the one core app
│       ├── __init__.py
│       ├── admin.py
│       ├── apps.py
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── permissions.py
│       ├── ml/
│       │   ├── __init__.py
│       │   ├── train.py               # model training (RF + XGBoost)
│       │   ├── predict.py              # generate forecasts
│       │   └── features.py             # feature engineering (weather/holiday/seasonality)
│       ├── management/
│       │   └── commands/
│       │       ├── seed_data.py
│       │       └── run_forecast.py
│       └── migrations/
│
└── frontend/
    ├── index.html                      # includes Bootstrap Icons CDN link
    ├── package.json
    ├── vite.config.js
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── services/
    │   │   └── api.js                  # all endpoint calls (axios instance)
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── AppLayout.jsx
    │   │   └── Spinner.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Products.jsx
    │   │   ├── Regions.jsx
    │   │   ├── Sales.jsx
    │   │   ├── Weather.jsx
    │   │   ├── Forecasts.jsx
    │   │   ├── Recommendations.jsx
    │   │   └── Reports.jsx
    │   └── styles/
    │       └── main_ccba.css
    └── public/
```

## Core Models (core/models.py)
- `User` (custom, role-based: admin/analyst/manager)
- `Product` — Coca-Cola product catalog
- `Region` — sales location / county
- `Sale` — daily/transactional sales record
- `WeatherRecord` — temperature, rainfall, humidity per region/date
- `Holiday` — public holidays/events calendar
- `Event` — football matches, concerts, festivals
- `ForecastModel` — registry of trained ML model versions + metrics
- `Forecast` — predicted demand per product/region/date
- `Recommendation` — AI-generated decision-support alerts
- `Report` — generated PDF/Excel report records

## Key API Endpoints (under /api/)
```
POST   /api/auth/login/
POST   /api/auth/refresh/
GET    /api/auth/me/

GET    /api/products/            GET/POST  /api/products/<id>/
GET    /api/regions/             GET/POST  /api/regions/<id>/
GET    /api/sales/               POST      /api/sales/bulk-upload/
GET    /api/weather/
GET    /api/holidays/
GET    /api/events/

GET    /api/forecasts/                       (filters: product, region, horizon)
POST   /api/forecasts/generate/              (trigger run_forecast)
GET    /api/forecasts/accuracy/              (model performance comparison)

GET    /api/recommendations/

GET    /api/reports/
POST   /api/reports/generate/                (pdf/excel)

GET    /api/dashboard/summary/               (total sales, accuracy, trends, regional perf)
```

## ML Pipeline
1. `core/ml/features.py` — joins Sale + WeatherRecord + Holiday + Event, derives month/quarter/weekend flags.
2. `core/ml/train.py` — trains Linear Regression (baseline), Random Forest, XGBoost; saves model + metrics to `ForecastModel`.
3. `core/ml/predict.py` — loads best model, generates 7/30-day forecasts into `Forecast` table.
4. `Recommendation` rows are auto-generated when a forecast shows >15% deviation from the trailing average, referencing the contributing factor (weather/holiday).

## Setup

```bash
# backend
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_data
python manage.py createsuperuser
python manage.py runserver

# frontend
cd frontend
npm install
npm run dev
```

## Environment Variables (.env)
```
SECRET_KEY=
DEBUG=True
DATABASE_URL=postgres://user:pass@localhost:5432/ccba_forecast
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```