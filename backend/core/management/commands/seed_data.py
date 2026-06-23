import math
import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from core.models import (
    Product, Region, Sale, WeatherRecord, Holiday, Event,
    ForecastModel, Forecast, Recommendation,
)

User = get_user_model()
random.seed(42)

YEARS_OF_HISTORY = 3
TODAY = date.today()
START_DATE = TODAY - timedelta(days=365 * YEARS_OF_HISTORY)

# ---------------------------------------------------------------------------
# REFERENCE DATA — KENYAN MARKET
# ---------------------------------------------------------------------------
REGIONS = [
    {"name": "Nairobi CBD", "county": "Nairobi", "lat": -1.2864, "lng": 36.8172, "base_temp": 22, "base_rain": 2.0},
    {"name": "Westlands", "county": "Nairobi", "lat": -1.2676, "lng": 36.8108, "base_temp": 21, "base_rain": 2.0},
    {"name": "Mombasa Island", "county": "Mombasa", "lat": -4.0435, "lng": 39.6682, "base_temp": 29, "base_rain": 3.5},
    {"name": "Nyali", "county": "Mombasa", "lat": -4.0089, "lng": 39.7197, "base_temp": 29, "base_rain": 3.5},
    {"name": "Kisumu Central", "county": "Kisumu", "lat": -0.0917, "lng": 34.7680, "base_temp": 26, "base_rain": 4.0},
    {"name": "Nakuru Town", "county": "Nakuru", "lat": -0.3031, "lng": 36.0800, "base_temp": 20, "base_rain": 2.5},
    {"name": "Eldoret Town", "county": "Uasin Gishu", "lat": 0.5143, "lng": 35.2698, "base_temp": 18, "base_rain": 3.0},
    {"name": "Thika", "county": "Kiambu", "lat": -1.0332, "lng": 37.0692, "base_temp": 22, "base_rain": 2.3},
    {"name": "Machakos Town", "county": "Machakos", "lat": -1.5177, "lng": 37.2634, "base_temp": 23, "base_rain": 1.8},
    {"name": "Malindi", "county": "Kilifi", "lat": -3.2138, "lng": 40.1169, "base_temp": 28, "base_rain": 3.2},
]

PRODUCTS = [
    {"name": "Coca-Cola Original", "sku": "CCO-500ML", "category": Product.Category.CARBONATED, "pack_size": "500ml", "price": 70, "base_demand": 220},
    {"name": "Coca-Cola Original", "sku": "CCO-300ML-CAN", "category": Product.Category.CARBONATED, "pack_size": "300ml Can", "price": 60, "base_demand": 140},
    {"name": "Coca-Cola Original", "sku": "CCO-1.25L", "category": Product.Category.CARBONATED, "pack_size": "1.25L", "price": 120, "base_demand": 90},
    {"name": "Fanta Orange", "sku": "FAN-ORG-500ML", "category": Product.Category.CARBONATED, "pack_size": "500ml", "price": 70, "base_demand": 160},
    {"name": "Fanta Blackcurrant", "sku": "FAN-BLK-500ML", "category": Product.Category.CARBONATED, "pack_size": "500ml", "price": 70, "base_demand": 95},
    {"name": "Sprite", "sku": "SPR-500ML", "category": Product.Category.CARBONATED, "pack_size": "500ml", "price": 70, "base_demand": 150},
    {"name": "Minute Maid Mango", "sku": "MMD-MNG-450ML", "category": Product.Category.JUICE, "pack_size": "450ml", "price": 90, "base_demand": 75},
    {"name": "Minute Maid Tropical", "sku": "MMD-TRP-450ML", "category": Product.Category.JUICE, "pack_size": "450ml", "price": 90, "base_demand": 60},
    {"name": "Dasani Water", "sku": "DSN-500ML", "category": Product.Category.WATER, "pack_size": "500ml", "price": 50, "base_demand": 260},
    {"name": "Dasani Water", "sku": "DSN-1L", "category": Product.Category.WATER, "pack_size": "1L", "price": 80, "base_demand": 110},
    {"name": "Predator Energy", "sku": "PRD-350ML", "category": Product.Category.ENERGY, "pack_size": "350ml", "price": 100, "base_demand": 55},
]

KENYAN_FIRST_NAMES = [
    "Wanjiku", "Kamau", "Njoroge", "Achieng", "Otieno", "Wafula", "Chebet",
    "Kiptoo", "Mutua", "Nyambura", "Akinyi", "Mwangi", "Wambui", "Kiprono",
    "Atieno", "Were", "Cherono", "Kosgei", "Muthoni", "Omondi",
]
KENYAN_LAST_NAMES = [
    "Kamau", "Otieno", "Wanjiru", "Mwangi", "Kiplagat", "Chepkemoi", "Maina",
    "Onyango", "Njuguna", "Korir", "Wekesa", "Kibet", "Nduta", "Mutiso",
]

HOLIDAYS_BY_YEAR_OFFSET = [
    ("New Year's Day", 1, 1),
    ("Good Friday", 4, 7),       # approximate, varies — used as proxy
    ("Easter Monday", 4, 10),
    ("Labour Day", 5, 1),
    ("Madaraka Day", 6, 1),
    ("Eid al-Fitr (approx.)", 4, 21),
    ("Huduma Day", 10, 10),
    ("Mashujaa Day", 10, 20),
    ("Jamhuri Day", 12, 12),
    ("Christmas Day", 12, 25),
    ("Boxing Day", 12, 26),
]

EVENT_TEMPLATES = [
    ("Gor Mahia vs AFC Leopards Derby", Event.EventType.SPORTS, 25000),
    ("Nairobi International Trade Fair", Event.EventType.FESTIVAL, 40000),
    ("Blankets & Wine Nairobi", Event.EventType.CONCERT, 8000),
    ("Mombasa Carnival", Event.EventType.FESTIVAL, 30000),
    ("Safari Rally Weekend", Event.EventType.SPORTS, 50000),
    ("Koroga Festival", Event.EventType.CONCERT, 12000),
    ("Kisumu Cultural Festival", Event.EventType.FESTIVAL, 9000),
]


class Command(BaseCommand):
    help = "Seeds 3 years of realistic Kenyan demand-forecasting data (products, regions, sales, weather, holidays, events, model registry)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush", action="store_true", help="Delete existing seeded data before reseeding."
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write("Flushing existing data...")
            Recommendation.objects.all().delete()
            Forecast.objects.all().delete()
            ForecastModel.objects.all().delete()
            Sale.objects.all().delete()
            WeatherRecord.objects.all().delete()
            Event.objects.all().delete()
            Holiday.objects.all().delete()

        with transaction.atomic():
            regions = self._seed_regions()
            products = self._seed_products()
            self._seed_users(regions)
            self._seed_holidays(regions)
            self._seed_events(regions)
            self._seed_weather(regions)
            self._seed_sales(products, regions)
            model = self._seed_forecast_model()
            self._seed_forecasts_and_recommendations(products, regions, model)

        self.stdout.write(self.style.SUCCESS("✓ CCBA demand forecasting seed data created (3 years)."))

    # -----------------------------------------------------------------
    def _seed_regions(self):
        self.stdout.write("Seeding regions...")
        regions = []
        for r in REGIONS:
            obj, _ = Region.objects.update_or_create(
                name=r["name"], county=r["county"],
                defaults={"latitude": r["lat"], "longitude": r["lng"]},
            )
            obj._base_temp = r["base_temp"]
            obj._base_rain = r["base_rain"]
            regions.append(obj)
        return regions

    def _seed_products(self):
        self.stdout.write("Seeding products...")
        products = []
        for p in PRODUCTS:
            obj, _ = Product.objects.update_or_create(
                sku=p["sku"],
                defaults={
                    "name": p["name"],
                    "category": p["category"],
                    "pack_size": p["pack_size"],
                    "price": Decimal(p["price"]),
                    "is_active": True,
                },
            )
            obj._base_demand = p["base_demand"]
            products.append(obj)
        return products

    def _seed_users(self, regions):
        self.stdout.write("Seeding users...")
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin", email="admin@ccba.co.ke", password="Admin@2026", role=User.Role.ADMIN
            )
        sample_region_pairs = list(zip(KENYAN_FIRST_NAMES, regions * 2))[:8]
        for i, (first, region) in enumerate(sample_region_pairs):
            username = f"analyst.{first.lower()}"
            if not User.objects.filter(username=username).exists():
                User.objects.create_user(
                    username=username,
                    email=f"{username}@ccba.co.ke",
                    password="Analyst@2026",
                    first_name=first,
                    last_name=random.choice(KENYAN_LAST_NAMES),
                    role=User.Role.ANALYST if i % 3 else User.Role.MANAGER,
                    region=region,
                    phone_number=f"+2547{random.randint(10000000, 99999999)}",
                )

    def _seed_holidays(self, regions):
        self.stdout.write("Seeding holidays...")
        objs = []
        for year_offset in range(YEARS_OF_HISTORY + 1):
            year = START_DATE.year + year_offset
            for name, month, day in HOLIDAYS_BY_YEAR_OFFSET:
                try:
                    d = date(year, month, day)
                except ValueError:
                    continue
                if START_DATE <= d <= TODAY + timedelta(days=60):
                    objs.append(Holiday(name=name, date=d, is_national=True, region=None))
        Holiday.objects.bulk_create(objs, ignore_conflicts=True)

    def _seed_events(self, regions):
        self.stdout.write("Seeding events...")
        objs = []
        current = START_DATE
        while current <= TODAY:
            if random.random() < 0.04:  # roughly a handful of events per month
                name, etype, attendance = random.choice(EVENT_TEMPLATES)
                region = random.choice(regions)
                duration = random.randint(1, 3)
                objs.append(
                    Event(
                        name=f"{name} {current.year}",
                        event_type=etype,
                        region=region,
                        start_date=current,
                        end_date=current + timedelta(days=duration),
                        expected_attendance=attendance + random.randint(-2000, 4000),
                    )
                )
            current += timedelta(days=1)
        Event.objects.bulk_create(objs, batch_size=1000)

    def _seed_weather(self, regions):
        self.stdout.write("Seeding 3 years of daily weather records (this takes a moment)...")
        objs = []
        for region in regions:
            current = START_DATE
            while current <= TODAY:
                day_of_year = current.timetuple().tm_yday
                seasonal = 4 * math.sin((day_of_year / 365.25) * 2 * math.pi)
                temp = round(region._base_temp + seasonal + random.uniform(-2.5, 2.5), 1)
                # Kenya's long rains (Mar-May) & short rains (Oct-Dec)
                rain_season_factor = 1.0
                if current.month in (3, 4, 5):
                    rain_season_factor = 2.5
                elif current.month in (10, 11, 12):
                    rain_season_factor = 1.8
                rainfall = round(max(0, region._base_rain * rain_season_factor + random.uniform(-1.5, 3.0)), 1)
                humidity = round(min(100, max(30, 55 + seasonal + rainfall * 2 + random.uniform(-5, 5))), 1)

                objs.append(
                    WeatherRecord(
                        region=region, weather_date=current,
                        temperature=temp, rainfall=rainfall, humidity=humidity,
                    )
                )
                current += timedelta(days=1)

            if len(objs) > 5000:
                WeatherRecord.objects.bulk_create(objs, ignore_conflicts=True, batch_size=2000)
                objs = []
        if objs:
            WeatherRecord.objects.bulk_create(objs, ignore_conflicts=True, batch_size=2000)

    def _seed_sales(self, products, regions):
        self.stdout.write("Seeding 3 years of daily sales (product x region)... this is the big one.")

        holiday_dates = set(Holiday.objects.values_list("date", flat=True))
        event_dates = set()
        for ev in Event.objects.all():
            d = ev.start_date
            while d <= ev.end_date:
                event_dates.add((d, ev.region_id))
                d += timedelta(days=1)

        weather_lookup = {
            (w.region_id, w.weather_date): w
            for w in WeatherRecord.objects.filter(weather_date__gte=START_DATE)
        }

        objs = []
        for product in products:
            for region in regions:
                current = START_DATE
                # slight regional/product multiplier for realism
                region_multiplier = 0.7 + (hash(region.name) % 50) / 100
                while current <= TODAY:
                    weather = weather_lookup.get((region.id, current))
                    temp = float(weather.temperature) if weather else 24
                    rain = float(weather.rainfall) if weather else 2

                    is_weekend = current.weekday() >= 5
                    is_holiday = current in holiday_dates
                    is_event = (current, region.id) in event_dates

                    demand = product._base_demand * region_multiplier
                    demand *= 1.15 if is_weekend else 1.0
                    demand *= 1.35 if is_holiday else 1.0
                    demand *= 1.25 if is_event else 1.0
                    # hot weather boosts soft drink/water demand; heavy rain suppresses it
                    demand *= 1 + max(0, (temp - 24)) * 0.025
                    demand *= 1 - min(0.3, rain * 0.015)
                    # mild end-of-month promo bump
                    promotion_active = current.day in (1, 15) and random.random() < 0.6
                    if promotion_active:
                        demand *= 1.2

                    demand *= random.uniform(0.85, 1.15)  # noise
                    qty = max(1, int(round(demand)))

                    objs.append(
                        Sale(
                            product=product,
                            region=region,
                            sales_date=current,
                            quantity_sold=qty,
                            unit_price=product.price,
                            promotion_active=promotion_active,
                            promotion_name="Mid-Month Discount" if promotion_active else "",
                        )
                    )
                    current += timedelta(days=1)

                if len(objs) > 8000:
                    Sale.objects.bulk_create(objs, ignore_conflicts=True, batch_size=3000)
                    self.stdout.write(f"  ...flushed batch ({product.sku} / {region.name})")
                    objs = []

        if objs:
            Sale.objects.bulk_create(objs, ignore_conflicts=True, batch_size=3000)

    def _seed_forecast_model(self):
        self.stdout.write("Registering trained forecast models...")
        ForecastModel.objects.filter(is_active=True).update(is_active=False)
        linear = ForecastModel.objects.create(
            algorithm=ForecastModel.Algorithm.LINEAR_REGRESSION, version="1.0",
            mae=38.2, rmse=51.4, r2_score=0.61, accuracy_pct=71.5,
            notes="Baseline model.",
        )
        rf = ForecastModel.objects.create(
            algorithm=ForecastModel.Algorithm.RANDOM_FOREST, version="1.0",
            mae=21.6, rmse=29.8, r2_score=0.84, accuracy_pct=86.3,
            notes="Trained on 3 years of sales + weather + holiday + event features.",
        )
        xgb = ForecastModel.objects.create(
            algorithm=ForecastModel.Algorithm.XGBOOST, version="1.0",
            mae=18.9, rmse=25.1, r2_score=0.88, accuracy_pct=89.1,
            is_active=True,
            notes="Best performing model — currently powering live forecasts.",
        )
        return xgb

    def _seed_forecasts_and_recommendations(self, products, regions, model):
        self.stdout.write("Seeding forward-looking forecasts and AI recommendations...")
        forecasts = []
        for product in products:
            for region in regions:
                trailing_avg = (
                    Sale.objects.filter(product=product, region=region)
                    .order_by("-sales_date")[:30]
                )
                avg_qty = sum(s.quantity_sold for s in trailing_avg) / max(1, len(trailing_avg))
                for day_ahead in (1, 7, 30):
                    forecast_date = TODAY + timedelta(days=day_ahead)
                    change_pct = random.uniform(-12, 22)
                    predicted = max(1, round(avg_qty * (1 + change_pct / 100), 2))
                    horizon = {1: Forecast.Horizon.DAILY, 7: Forecast.Horizon.WEEKLY, 30: Forecast.Horizon.MONTHLY}[day_ahead]
                    forecasts.append(
                        Forecast(
                            product=product, region=region, model_used=model,
                            horizon=horizon, forecast_date=forecast_date,
                            predicted_demand=Decimal(str(predicted)),
                            confidence_lower=Decimal(str(round(predicted * 0.85, 2))),
                            confidence_upper=Decimal(str(round(predicted * 1.15, 2))),
                        )
                    )
        Forecast.objects.bulk_create(forecasts, batch_size=2000)

        # Generate a handful of standout recommendations (>15% deviation)
        recs = []
        weekly_forecasts = Forecast.objects.filter(horizon=Forecast.Horizon.WEEKLY).select_related("product", "region")
        for f in weekly_forecasts:
            trailing_avg = (
                Sale.objects.filter(product=f.product, region=f.region)
                .order_by("-sales_date")[:30]
            )
            avg_qty = sum(s.quantity_sold for s in trailing_avg) / max(1, len(trailing_avg))
            if avg_qty == 0:
                continue
            change_pct = float((f.predicted_demand - Decimal(str(avg_qty))) / Decimal(str(avg_qty)) * 100)
            if abs(change_pct) >= 15:
                factors = []
                upcoming_holiday = Holiday.objects.filter(
                    date__range=(f.forecast_date - timedelta(days=2), f.forecast_date + timedelta(days=2))
                ).first()
                if upcoming_holiday:
                    factors.append("holiday")
                recent_weather = WeatherRecord.objects.filter(region=f.region).order_by("-weather_date").first()
                if recent_weather and float(recent_weather.temperature) > 26:
                    factors.append("weather")
                if not factors:
                    factors.append("seasonality")

                direction = "increase" if change_pct > 0 else "decrease"
                reason_bits = []
                if "weather" in factors:
                    reason_bits.append("high temperatures")
                if "holiday" in factors:
                    reason_bits.append(f"the {upcoming_holiday.name} holiday" if upcoming_holiday else "an upcoming holiday")
                reason = " and ".join(reason_bits) if reason_bits else "seasonal demand patterns"

                message = (
                    f"Demand for {f.product.name} ({f.product.pack_size}) in {f.region.name} is expected to "
                    f"{direction} by {abs(change_pct):.0f}% next week due to {reason}. "
                    f"{'Increase' if change_pct > 0 else 'Reduce'} inventory allocation accordingly."
                )
                severity = (
                    Recommendation.Severity.CRITICAL if abs(change_pct) >= 30
                    else Recommendation.Severity.WARNING if abs(change_pct) >= 20
                    else Recommendation.Severity.INFO
                )
                recs.append(
                    Recommendation(
                        product=f.product, region=f.region, forecast=f,
                        message=message, contributing_factors=factors,
                        change_pct=round(change_pct, 1), severity=severity,
                    )
                )
        Recommendation.objects.bulk_create(recs, batch_size=1000)
        self.stdout.write(f"  Created {len(forecasts)} forecasts and {len(recs)} recommendations.")