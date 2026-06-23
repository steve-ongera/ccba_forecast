from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Product, Region, Sale, WeatherRecord, Holiday, Event,
    ForecastModel, Forecast, Recommendation, Report,
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "region", "is_staff")
    list_filter = ("role", "is_staff", "region")
    fieldsets = UserAdmin.fieldsets + (
        ("CCBA Profile", {"fields": ("role", "phone_number", "region")}),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "category", "pack_size", "price", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name", "sku")


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("name", "county", "latitude", "longitude")
    search_fields = ("name", "county")


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("product", "region", "sales_date", "quantity_sold", "unit_price", "promotion_active")
    list_filter = ("region", "promotion_active", "sales_date")
    search_fields = ("product__name", "region__name")
    date_hierarchy = "sales_date"


@admin.register(WeatherRecord)
class WeatherRecordAdmin(admin.ModelAdmin):
    list_display = ("region", "weather_date", "temperature", "rainfall", "humidity")
    list_filter = ("region",)
    date_hierarchy = "weather_date"


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ("name", "date", "is_national", "region")
    list_filter = ("is_national",)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "event_type", "region", "start_date", "end_date", "expected_attendance")
    list_filter = ("event_type", "region")


@admin.register(ForecastModel)
class ForecastModelAdmin(admin.ModelAdmin):
    list_display = ("algorithm", "version", "trained_on", "mae", "rmse", "r2_score", "accuracy_pct", "is_active")
    list_filter = ("algorithm", "is_active")


@admin.register(Forecast)
class ForecastAdmin(admin.ModelAdmin):
    list_display = ("product", "region", "horizon", "forecast_date", "predicted_demand", "actual_demand")
    list_filter = ("horizon", "region", "product")
    date_hierarchy = "forecast_date"


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ("product", "region", "severity", "change_pct", "is_read", "created_at")
    list_filter = ("severity", "is_read", "region")
    actions = ["mark_as_read"]

    @admin.action(description="Mark selected recommendations as read")
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("title", "report_format", "generated_by", "created_at")
    list_filter = ("report_format",)