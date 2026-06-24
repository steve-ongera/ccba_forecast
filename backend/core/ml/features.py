"""
Feature engineering for CCBA demand forecasting.

Joins Sale records with WeatherRecord, Holiday, and Event data, then derives
calendar/seasonality features. Produces a pandas DataFrame ready for model
training or inference.
"""
import pandas as pd
import numpy as np
from datetime import timedelta

from core.models import Sale, WeatherRecord, Holiday, Event


FEATURE_COLUMNS = [
    "temperature", "rainfall", "humidity",
    "is_weekend", "is_holiday", "is_event",
    "month", "quarter", "day_of_week", "day_of_month",
    "unit_price", "promotion_active",
    "lag_7_avg_qty", "lag_30_avg_qty",
]
TARGET_COLUMN = "quantity_sold"


def _sales_to_df(product_id=None, region_id=None, date_from=None, date_to=None):
    qs = Sale.objects.select_related("product", "region").all()
    if product_id:
        qs = qs.filter(product_id=product_id)
    if region_id:
        qs = qs.filter(region_id=region_id)
    if date_from:
        qs = qs.filter(sales_date__gte=date_from)
    if date_to:
        qs = qs.filter(sales_date__lte=date_to)

    rows = qs.values(
        "product_id", "region_id", "sales_date", "quantity_sold",
        "unit_price", "promotion_active",
    )
    df = pd.DataFrame.from_records(rows)
    if df.empty:
        return df
    df["sales_date"] = pd.to_datetime(df["sales_date"])
    df["unit_price"] = df["unit_price"].astype(float)
    df["quantity_sold"] = df["quantity_sold"].astype(float)
    return df


def _weather_to_df(region_ids):
    rows = WeatherRecord.objects.filter(region_id__in=region_ids).values(
        "region_id", "weather_date", "temperature", "rainfall", "humidity"
    )
    df = pd.DataFrame.from_records(rows)
    if df.empty:
        return df
    df["weather_date"] = pd.to_datetime(df["weather_date"])
    df["temperature"] = df["temperature"].astype(float)
    df["rainfall"] = df["rainfall"].astype(float)
    df["humidity"] = df["humidity"].astype(float)
    return df


def _holiday_dates():
    return set(pd.to_datetime(list(Holiday.objects.values_list("date", flat=True))))


def _event_date_region_pairs():
    pairs = set()
    for ev in Event.objects.all():
        d = ev.start_date
        while d <= ev.end_date:
            pairs.add((pd.Timestamp(d), ev.region_id))
            d += timedelta(days=1)
    return pairs


def build_feature_dataframe(product_id=None, region_id=None, date_from=None, date_to=None):
    """
    Returns a fully featured DataFrame: one row per (product, region, sales_date),
    with weather joined and calendar/seasonality + lag features derived.
    """
    sales_df = _sales_to_df(product_id, region_id, date_from, date_to)
    if sales_df.empty:
        return sales_df

    region_ids = sales_df["region_id"].unique().tolist()
    weather_df = _weather_to_df(region_ids)

    if not weather_df.empty:
        sales_df = sales_df.merge(
            weather_df,
            left_on=["region_id", "sales_date"],
            right_on=["region_id", "weather_date"],
            how="left",
        )
    else:
        sales_df["temperature"] = np.nan
        sales_df["rainfall"] = np.nan
        sales_df["humidity"] = np.nan

    # fill any missing weather with regional means
    for col in ("temperature", "rainfall", "humidity"):
        sales_df[col] = sales_df.groupby("region_id")[col].transform(lambda s: s.fillna(s.mean()))
        sales_df[col] = sales_df[col].fillna(sales_df[col].mean())
        sales_df[col] = sales_df[col].astype(float)

    holiday_dates = _holiday_dates()
    event_pairs = _event_date_region_pairs()

    sales_df["is_holiday"] = sales_df["sales_date"].isin(holiday_dates).astype(int)
    sales_df["is_event"] = sales_df.apply(
        lambda r: 1 if (r["sales_date"], r["region_id"]) in event_pairs else 0, axis=1
    )
    sales_df["is_weekend"] = sales_df["sales_date"].dt.dayofweek.isin([5, 6]).astype(int)
    sales_df["month"] = sales_df["sales_date"].dt.month
    sales_df["quarter"] = sales_df["sales_date"].dt.quarter
    sales_df["day_of_week"] = sales_df["sales_date"].dt.dayofweek
    sales_df["day_of_month"] = sales_df["sales_date"].dt.day
    sales_df["promotion_active"] = sales_df["promotion_active"].astype(int)

    # lag / rolling features per product-region series
    sales_df = sales_df.sort_values(["product_id", "region_id", "sales_date"])
    grp = sales_df.groupby(["product_id", "region_id"])["quantity_sold"]
    sales_df["lag_7_avg_qty"] = grp.transform(lambda s: s.shift(1).rolling(7, min_periods=1).mean())
    sales_df["lag_30_avg_qty"] = grp.transform(lambda s: s.shift(1).rolling(30, min_periods=1).mean())
    sales_df["lag_7_avg_qty"] = sales_df["lag_7_avg_qty"].fillna(sales_df["quantity_sold"].mean())
    sales_df["lag_30_avg_qty"] = sales_df["lag_30_avg_qty"].fillna(sales_df["quantity_sold"].mean())

    return sales_df


def latest_feature_row(product_id, region_id):
    """
    Builds a single-row feature vector representing 'tomorrow' for a given
    product/region, using the latest known weather + lag averages.
    Used as the basis for forward forecasting in predict.py.
    """
    df = build_feature_dataframe(product_id=product_id, region_id=region_id)
    if df.empty:
        return None
    return df.iloc[-1]