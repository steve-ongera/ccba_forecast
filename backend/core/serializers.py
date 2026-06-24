from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Product, Region, Sale, WeatherRecord, Holiday, Event,
    ForecastModel, Forecast, Recommendation, Report,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "phone_number", "region"]
        read_only_fields = ["id"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = "__all__"


class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    region_name = serializers.CharField(source="region.name", read_only=True)
    revenue = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = "__all__"
        extra_fields = ["product_name", "region_name", "revenue"]

    def get_revenue(self, obj):
        return obj.revenue


class SaleBulkUploadSerializer(serializers.Serializer):
    file = serializers.FileField()


class WeatherRecordSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source="region.name", read_only=True)

    class Meta:
        model = WeatherRecord
        fields = "__all__"


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = "__all__"


class EventSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source="region.name", read_only=True)

    class Meta:
        model = Event
        fields = "__all__"


class ForecastModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForecastModel
        fields = "__all__"


class ForecastSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    region_name = serializers.CharField(source="region.name", read_only=True)
    algorithm = serializers.CharField(source="model_used.algorithm", read_only=True)
    deviation_pct = serializers.ReadOnlyField()

    class Meta:
        model = Forecast
        fields = "__all__"


class GenerateForecastSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    region_id = serializers.IntegerField(required=False)
    horizon = serializers.ChoiceField(choices=Forecast.Horizon.choices, default=Forecast.Horizon.WEEKLY)
    algorithm = serializers.ChoiceField(choices=ForecastModel.Algorithm.choices, required=False)


class RecommendationSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    region_name = serializers.CharField(source="region.name", read_only=True)

    class Meta:
        model = Recommendation
        fields = "__all__"


class ReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(source="generated_by.username", read_only=True)

    class Meta:
        model = Report
        fields = "__all__"
        read_only_fields = ["generated_by", "file_path", "status", "error_message", "created_at"]


class DashboardSummarySerializer(serializers.Serializer):
    total_sales = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_units_sold = serializers.IntegerField()
    active_products = serializers.IntegerField()
    forecast_accuracy_pct = serializers.FloatField(allow_null=True)
    demand_trend = serializers.ListField()
    regional_performance = serializers.ListField()
    recent_recommendations = RecommendationSerializer(many=True)