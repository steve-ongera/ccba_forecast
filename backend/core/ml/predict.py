"""
Generates demand forecasts using the currently active ForecastModel, and
auto-creates AI Recommendation alerts when a forecast deviates significantly
(>=15%) from the trailing 30-day average.

Usage (e.g. from the /api/forecasts/generate/ endpoint):
    from core.ml.predict import generate_forecasts
    generate_forecasts(product_id=1, region_id=3, horizon="weekly")
"""
import os
from datetime import timedelta
from decimal import Decimal

import joblib
import numpy as np
import pandas as pd
from django.conf import settings
from django.utils import timezone

from core.models import (
    Product, Region, ForecastModel, Forecast, Recommendation,
    Sale, Holiday, WeatherRecord,
)
from .features import FEATURE_COLUMNS, latest_feature_row

HORIZON_DAYS = {
    Forecast.Horizon.DAILY: 1,
    Forecast.Horizon.WEEKLY: 7,
    Forecast.Horizon.MONTHLY: 30,
}

DEVIATION_THRESHOLD_PCT = 15


def _load_active_model():
    model_record = ForecastModel.objects.filter(is_active=True).order_by("-trained_on").first()
    if not model_record or not model_record.model_file_path:
        return None, None

    filepath = os.path.join(settings.MEDIA_ROOT, model_record.model_file_path)
    if not os.path.exists(filepath):
        return None, model_record
    return joblib.load(filepath), model_record


def _trailing_average(product_id, region_id, days=30):
    sales = (
        Sale.objects.filter(product_id=product_id, region_id=region_id)
        .order_by("-sales_date")[:days]
    )
    qtys = [s.quantity_sold for s in sales]
    return sum(qtys) / len(qtys) if qtys else 0


def _build_forecast_feature_row(feature_row, target_date, region_id):
    """Adjusts the latest known feature row's calendar fields to the target forecast date."""
    row = feature_row.copy()
    row["month"] = target_date.month
    row["quarter"] = (target_date.month - 1) // 3 + 1
    row["day_of_week"] = target_date.weekday()
    row["day_of_month"] = target_date.day
    row["is_weekend"] = int(target_date.weekday() >= 5)
    row["is_holiday"] = int(Holiday.objects.filter(date=target_date).exists())
    row["promotion_active"] = 0

    weather = WeatherRecord.objects.filter(region_id=region_id).order_by("-weather_date").first()
    if weather:
        row["temperature"] = float(weather.temperature)
        row["rainfall"] = float(weather.rainfall)
        row["humidity"] = float(weather.humidity)

    return row


def _contributing_factors(target_date, region_id, temperature):
    factors = []
    if Holiday.objects.filter(date=target_date).exists():
        factors.append("holiday")
    if temperature is not None and temperature > 26:
        factors.append("weather")
    if not factors:
        factors.append("seasonality")
    return factors


def _build_recommendation_message(product, region, change_pct, factors, holiday_name=None):
    direction = "increase" if change_pct > 0 else "decrease"
    reason_bits = []
    if "weather" in factors:
        reason_bits.append("high temperatures")
    if "holiday" in factors:
        reason_bits.append(f"the {holiday_name} holiday" if holiday_name else "an upcoming public holiday")
    if "seasonality" in factors and not reason_bits:
        reason_bits.append("seasonal demand patterns")
    reason = " and ".join(reason_bits) if reason_bits else "current market conditions"

    action = "Increase" if change_pct > 0 else "Reduce"
    return (
        f"Demand for {product.name} ({product.pack_size}) in {region.name} is expected to "
        f"{direction} by {abs(change_pct):.0f}% due to {reason}. "
        f"{action} inventory allocation accordingly."
    )


def _severity_for_change(change_pct):
    abs_change = abs(change_pct)
    if abs_change >= 30:
        return Recommendation.Severity.CRITICAL
    if abs_change >= 20:
        return Recommendation.Severity.WARNING
    return Recommendation.Severity.INFO


def generate_forecasts(product_id=None, region_id=None, horizon="weekly", algorithm=None):
    """
    Generates forecasts for the given product/region (or all, if omitted) at the
    requested horizon, persists them, and raises Recommendation alerts for any
    forecast deviating >=15% from the trailing 30-day average.
    """
    model, model_record = _load_active_model()
    if model is None:
        return {
            "created": 0,
            "error": "No trained model is available yet. Run training first (core.ml.train.train_all_models).",
        }

    products = Product.objects.filter(id=product_id) if product_id else Product.objects.filter(is_active=True)
    regions = Region.objects.filter(id=region_id) if region_id else Region.objects.all()

    days_ahead = HORIZON_DAYS.get(horizon, 7)
    target_date = timezone.now().date() + timedelta(days=days_ahead)

    created_forecasts = []
    created_recommendations = []

    for product in products:
        for region in regions:
            feature_row = latest_feature_row(product.id, region.id)
            if feature_row is None:
                continue  # no history yet for this product/region pair

            row = _build_forecast_feature_row(feature_row, target_date, region.id)
            X = pd.DataFrame([row[FEATURE_COLUMNS].to_dict()])
            predicted = float(model.predict(X)[0])
            predicted = max(0, predicted)

            forecast = Forecast.objects.create(
                product=product, region=region, model_used=model_record,
                horizon=horizon, forecast_date=target_date,
                predicted_demand=Decimal(str(round(predicted, 2))),
                confidence_lower=Decimal(str(round(predicted * 0.85, 2))),
                confidence_upper=Decimal(str(round(predicted * 1.15, 2))),
            )
            created_forecasts.append(forecast)

            trailing_avg = _trailing_average(product.id, region.id)
            if trailing_avg > 0:
                change_pct = (predicted - trailing_avg) / trailing_avg * 100
                if abs(change_pct) >= DEVIATION_THRESHOLD_PCT:
                    factors = _contributing_factors(target_date, region.id, row.get("temperature"))
                    holiday = Holiday.objects.filter(date=target_date).first()
                    message = _build_recommendation_message(
                        product, region, change_pct, factors, holiday.name if holiday else None
                    )
                    rec = Recommendation.objects.create(
                        product=product, region=region, forecast=forecast,
                        message=message, contributing_factors=factors,
                        change_pct=round(change_pct, 1),
                        severity=_severity_for_change(change_pct),
                    )
                    created_recommendations.append(rec)

    return {
        "created": len(created_forecasts),
        "recommendations_created": len(created_recommendations),
        "forecast_date": str(target_date),
        "horizon": horizon,
        "model_used": model_record.algorithm if model_record else None,
    }