import uuid
from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser


# ---------------------------------------------------------------------------
# USERS / ROLES
# ---------------------------------------------------------------------------
class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        ANALYST = "analyst", "Analyst"
        MANAGER = "manager", "Manager"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.ANALYST)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    region = models.ForeignKey(
        "Region", on_delete=models.SET_NULL, null=True, blank=True, related_name="staff"
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


# ---------------------------------------------------------------------------
# CATALOG / GEOGRAPHY
# ---------------------------------------------------------------------------
class Product(models.Model):
    class Category(models.TextChoices):
        CARBONATED = "carbonated", "Carbonated Soft Drink"
        JUICE = "juice", "Juice"
        WATER = "water", "Water"
        ENERGY = "energy", "Energy Drink"
        OTHER = "other", "Other"

    name = models.CharField(max_length=150)
    sku = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.CARBONATED)
    pack_size = models.CharField(max_length=50, blank=True)  # e.g. "500ml", "1L", "300ml Can"
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.pack_size})"


class Region(models.Model):
    name = models.CharField(max_length=150)
    county = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["county", "name"]
        unique_together = ("name", "county")

    def __str__(self):
        return f"{self.name}, {self.county}"


# ---------------------------------------------------------------------------
# SALES (internal data)
# ---------------------------------------------------------------------------
class Sale(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="sales")
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name="sales")
    sales_date = models.DateField()
    quantity_sold = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    promotion_active = models.BooleanField(default=False)
    promotion_name = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sales_date"]
        indexes = [
            models.Index(fields=["product", "region", "sales_date"]),
        ]
        unique_together = ("product", "region", "sales_date")

    def __str__(self):
        return f"{self.product} - {self.region} - {self.sales_date} ({self.quantity_sold})"

    @property
    def revenue(self):
        return self.quantity_sold * self.unit_price


# ---------------------------------------------------------------------------
# EXTERNAL FACTORS
# ---------------------------------------------------------------------------
class WeatherRecord(models.Model):
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name="weather_records")
    weather_date = models.DateField()
    temperature = models.DecimalField(max_digits=5, decimal_places=2, help_text="Degrees Celsius")
    rainfall = models.DecimalField(max_digits=6, decimal_places=2, help_text="mm")
    humidity = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-weather_date"]
        unique_together = ("region", "weather_date")

    def __str__(self):
        return f"{self.region} - {self.weather_date} ({self.temperature}°C)"


class Holiday(models.Model):
    name = models.CharField(max_length=150)
    date = models.DateField()
    is_national = models.BooleanField(default=True)
    region = models.ForeignKey(
        Region, on_delete=models.SET_NULL, null=True, blank=True, related_name="holidays"
    )

    class Meta:
        ordering = ["date"]
        unique_together = ("name", "date")

    def __str__(self):
        return f"{self.name} ({self.date})"


class Event(models.Model):
    class EventType(models.TextChoices):
        SPORTS = "sports", "Sports / Football Match"
        CONCERT = "concert", "Concert"
        FESTIVAL = "festival", "Festival"
        OTHER = "other", "Other"

    name = models.CharField(max_length=200)
    event_type = models.CharField(max_length=20, choices=EventType.choices, default=EventType.OTHER)
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name="events")
    start_date = models.DateField()
    end_date = models.DateField()
    expected_attendance = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["start_date"]

    def __str__(self):
        return f"{self.name} ({self.start_date})"


# ---------------------------------------------------------------------------
# MACHINE LEARNING
# ---------------------------------------------------------------------------
class ForecastModel(models.Model):
    class Algorithm(models.TextChoices):
        LINEAR_REGRESSION = "linear_regression", "Linear Regression"
        RANDOM_FOREST = "random_forest", "Random Forest Regressor"
        XGBOOST = "xgboost", "XGBoost"
        LSTM = "lstm", "LSTM Neural Network"
        PROPHET = "prophet", "Prophet"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    algorithm = models.CharField(max_length=30, choices=Algorithm.choices)
    version = models.CharField(max_length=20)
    trained_on = models.DateTimeField(auto_now_add=True)
    mae = models.FloatField(null=True, blank=True, help_text="Mean Absolute Error")
    rmse = models.FloatField(null=True, blank=True, help_text="Root Mean Squared Error")
    r2_score = models.FloatField(null=True, blank=True)
    accuracy_pct = models.FloatField(null=True, blank=True)
    model_file_path = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=False, help_text="Currently used for live forecasts")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-trained_on"]

    def __str__(self):
        return f"{self.get_algorithm_display()} v{self.version} (acc={self.accuracy_pct})"


class Forecast(models.Model):
    class Horizon(models.TextChoices):
        DAILY = "daily", "Next Day"
        WEEKLY = "weekly", "Next Week"
        MONTHLY = "monthly", "Next Month"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="forecasts")
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name="forecasts")
    model_used = models.ForeignKey(ForecastModel, on_delete=models.SET_NULL, null=True, related_name="forecasts")
    horizon = models.CharField(max_length=10, choices=Horizon.choices, default=Horizon.WEEKLY)
    forecast_date = models.DateField(help_text="The future date being predicted")
    predicted_demand = models.DecimalField(max_digits=12, decimal_places=2)
    confidence_lower = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    confidence_upper = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    actual_demand = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-forecast_date"]
        indexes = [
            models.Index(fields=["product", "region", "forecast_date"]),
        ]

    def __str__(self):
        return f"{self.product} - {self.region} - {self.forecast_date}: {self.predicted_demand}"

    @property
    def deviation_pct(self):
        """Deviation between predicted and actual, if actual is recorded."""
        if self.actual_demand and self.actual_demand != 0:
            return float((self.predicted_demand - self.actual_demand) / self.actual_demand * 100)
        return None


# ---------------------------------------------------------------------------
# AI RECOMMENDATION ENGINE (decision-support alerts)
# ---------------------------------------------------------------------------
class Recommendation(models.Model):
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="recommendations")
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name="recommendations")
    forecast = models.ForeignKey(Forecast, on_delete=models.CASCADE, related_name="recommendations")
    message = models.TextField(
        help_text='e.g. "Demand for Coca-Cola 500ml in Nairobi expected to rise 18% next week '
                  'due to high temperatures and a public holiday. Increase inventory allocation."'
    )
    contributing_factors = models.JSONField(default=list, blank=True)  # ["weather", "holiday", "event"]
    change_pct = models.FloatField(help_text="Expected % change vs trailing average")
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.INFO)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.severity}] {self.product} - {self.region} ({self.change_pct:+.1f}%)"


# ---------------------------------------------------------------------------
# REPORTS
# ---------------------------------------------------------------------------
class Report(models.Model):
    class ReportFormat(models.TextChoices):
        PDF = "pdf", "PDF"
        EXCEL = "excel", "Excel"

    class ReportType(models.TextChoices):
        FORECAST = "forecast", "Forecast"
        SALES = "sales", "Sales"
        PERFORMANCE = "performance", "Performance"
        RECOMMENDATIONS = "recommendations", "Recommendations"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        GENERATING = "generating", "Generating"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    title = models.CharField(max_length=200)
    description = models.CharField(max_length=255, blank=True)
    report_format = models.CharField(max_length=10, choices=ReportFormat.choices, default=ReportFormat.PDF)
    report_type = models.CharField(max_length=20, choices=ReportType.choices, default=ReportType.FORECAST)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="reports")
    file_path = models.CharField(max_length=255, blank=True)
    filters = models.JSONField(default=dict, blank=True)  # product/region/date-range used
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.report_format})"