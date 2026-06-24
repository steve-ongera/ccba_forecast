"""
Trains and compares demand forecasting models: Linear Regression (baseline),
Random Forest Regressor, and XGBoost. Saves the best model to disk and
registers metrics in the ForecastModel table.

Usage (e.g. from a management command or API view):
    from core.ml.train import train_all_models
    train_all_models()
"""
import os
import uuid
from datetime import datetime

import joblib
import numpy as np
from django.conf import settings
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
import xgboost as xgb

from core.models import ForecastModel
from .features import build_feature_dataframe, FEATURE_COLUMNS, TARGET_COLUMN

MODELS_DIR = os.path.join(settings.MEDIA_ROOT, "ml_models")


def _ensure_models_dir():
    os.makedirs(MODELS_DIR, exist_ok=True)


def _accuracy_from_mae(mae, mean_actual):
    """Rough accuracy % proxy: 100 - MAPE-like deviation, clipped to [0, 100]."""
    if mean_actual == 0:
        return 0.0
    pct_error = (mae / mean_actual) * 100
    return float(max(0.0, min(100.0, 100 - pct_error)))


def _prepare_dataset(product_id=None, region_id=None):
    df = build_feature_dataframe(product_id=product_id, region_id=region_id)
    if df.empty or len(df) < 30:
        raise ValueError("Not enough sales history to train a model (need at least 30 rows).")

    X = df[FEATURE_COLUMNS].fillna(0).astype(float)
    y = df[TARGET_COLUMN].astype(float)
    return train_test_split(X, y, test_size=0.2, shuffle=False)  # preserve time order


def _evaluate(model, X_test, y_test):
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2 = r2_score(y_test, preds)
    accuracy = _accuracy_from_mae(mae, y_test.mean())
    return mae, rmse, r2, accuracy


def _save_model_file(model, algorithm_key):
    _ensure_models_dir()
    filename = f"{algorithm_key}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.joblib"
    filepath = os.path.join(MODELS_DIR, filename)
    joblib.dump(model, filepath)
    return f"ml_models/{filename}"


def train_linear_regression(X_train, X_test, y_train, y_test):
    model = LinearRegression()
    model.fit(X_train, y_train)
    mae, rmse, r2, accuracy = _evaluate(model, X_test, y_test)
    return model, mae, rmse, r2, accuracy


def train_random_forest(X_train, X_test, y_train, y_test):
    model = RandomForestRegressor(
        n_estimators=200, max_depth=12, min_samples_leaf=2,
        random_state=42, n_jobs=-1,
    )
    model.fit(X_train, y_train)
    mae, rmse, r2, accuracy = _evaluate(model, X_test, y_test)
    return model, mae, rmse, r2, accuracy


def train_xgboost(X_train, X_test, y_train, y_test):
    model = xgb.XGBRegressor(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, random_state=42,
        objective="reg:squarederror",
    )
    model.fit(X_train, y_train)
    mae, rmse, r2, accuracy = _evaluate(model, X_test, y_test)
    return model, mae, rmse, r2, accuracy


def train_all_models(product_id=None, region_id=None, activate_best=True):
    """
    Trains Linear Regression, Random Forest, and XGBoost on the available
    sales history, registers each in ForecastModel, and (optionally)
    marks the best-performing one as active for live forecasting.

    Returns a list of dicts summarizing each trained model.
    """
    X_train, X_test, y_train, y_test = _prepare_dataset(product_id, region_id)

    trainers = {
        ForecastModel.Algorithm.LINEAR_REGRESSION: train_linear_regression,
        ForecastModel.Algorithm.RANDOM_FOREST: train_random_forest,
        ForecastModel.Algorithm.XGBOOST: train_xgboost,
    }

    results = []
    registered_models = []

    for algorithm_key, trainer_fn in trainers.items():
        model, mae, rmse, r2, accuracy = trainer_fn(X_train, X_test, y_train, y_test)
        file_path = _save_model_file(model, algorithm_key)

        registered = ForecastModel.objects.create(
            algorithm=algorithm_key,
            version=datetime.now().strftime("%Y%m%d.%H%M"),
            mae=round(mae, 2),
            rmse=round(rmse, 2),
            r2_score=round(r2, 4),
            accuracy_pct=round(accuracy, 2),
            model_file_path=file_path,
            notes=f"Trained on {len(X_train) + len(X_test)} rows.",
        )
        registered_models.append(registered)
        results.append(
            {
                "algorithm": algorithm_key,
                "mae": mae,
                "rmse": rmse,
                "r2_score": r2,
                "accuracy_pct": accuracy,
                "model_file_path": file_path,
            }
        )

    if activate_best:
        best = max(registered_models, key=lambda m: m.accuracy_pct or 0)
        ForecastModel.objects.exclude(id=best.id).update(is_active=False)
        best.is_active = True
        best.save(update_fields=["is_active"])
        for r in results:
            r["is_active"] = r["model_file_path"] == best.model_file_path

    return results