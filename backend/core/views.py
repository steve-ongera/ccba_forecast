from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Sum, Avg, Count, F
from django.utils import timezone
from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Product, Region, Sale, WeatherRecord, Holiday, Event,
    ForecastModel, Forecast, Recommendation, Report,
)
from .serializers import (
    ProductSerializer, RegionSerializer, SaleSerializer, SaleBulkUploadSerializer,
    WeatherRecordSerializer, HolidaySerializer, EventSerializer,
    ForecastModelSerializer, ForecastSerializer, GenerateForecastSerializer,
    RecommendationSerializer, ReportSerializer, UserSerializer,
)
from .permissions import IsAdminOrReadOnly, IsAdminOrAnalyst

User = get_user_model()


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------
class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ---------------------------------------------------------------------------
# CATALOG / GEOGRAPHY
# ---------------------------------------------------------------------------
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "is_active"]
    search_fields = ["name", "sku"]


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["county"]
    search_fields = ["name", "county"]


# ---------------------------------------------------------------------------
# SALES
# ---------------------------------------------------------------------------
class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related("product", "region").all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product", "region", "sales_date", "promotion_active"]

    @action(detail=False, methods=["post"], url_path="bulk-upload")
    def bulk_upload(self, request):
        """Accepts a CSV file: product_sku, region_name, sales_date, quantity_sold, unit_price, promotion_active"""
        import csv
        import io

        serializer = SaleBulkUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file = serializer.validated_data["file"]

        decoded = io.TextIOWrapper(file.file, encoding="utf-8")
        reader = csv.DictReader(decoded)
        created, errors = 0, []

        for i, row in enumerate(reader, start=1):
            try:
                product = Product.objects.get(sku=row["product_sku"])
                region = Region.objects.get(name=row["region_name"])
                Sale.objects.update_or_create(
                    product=product,
                    region=region,
                    sales_date=row["sales_date"],
                    defaults={
                        "quantity_sold": row["quantity_sold"],
                        "unit_price": row["unit_price"],
                        "promotion_active": row.get("promotion_active", "False").lower() == "true",
                    },
                )
                created += 1
            except Exception as exc:
                errors.append({"row": i, "error": str(exc)})

        return Response({"created": created, "errors": errors}, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# EXTERNAL FACTORS
# ---------------------------------------------------------------------------
class WeatherRecordViewSet(viewsets.ModelViewSet):
    queryset = WeatherRecord.objects.select_related("region").all()
    serializer_class = WeatherRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["region", "weather_date"]


class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["region", "is_national"]


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related("region").all()
    serializer_class = EventSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["region", "event_type"]


# ---------------------------------------------------------------------------
# FORECASTING
# ---------------------------------------------------------------------------
class ForecastModelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ForecastModel.objects.all()
    serializer_class = ForecastModelSerializer
    permission_classes = [IsAuthenticated]


class ForecastViewSet(viewsets.ModelViewSet):
    queryset = Forecast.objects.select_related("product", "region", "model_used").all()
    serializer_class = ForecastSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product", "region", "horizon", "forecast_date"]

    @action(detail=False, methods=["post"], permission_classes=[IsAdminOrAnalyst])
    def generate(self, request):
        """Triggers forecast generation via the ML pipeline (core.ml.predict)."""
        from .ml.predict import generate_forecasts

        serializer = GenerateForecastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = generate_forecasts(**serializer.validated_data)
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def accuracy(self, request):
        """Compares model performance across trained algorithms."""
        models_qs = ForecastModel.objects.all().order_by("-trained_on")[:10]
        data = ForecastModelSerializer(models_qs, many=True).data
        return Response(data)


# ---------------------------------------------------------------------------
# RECOMMENDATIONS
# ---------------------------------------------------------------------------
class RecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Recommendation.objects.select_related("product", "region", "forecast").all()
    serializer_class = RecommendationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product", "region", "severity", "is_read"]

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        rec = self.get_object()
        rec.is_read = True
        rec.save(update_fields=["is_read"])
        return Response(RecommendationSerializer(rec).data)


# ---------------------------------------------------------------------------
# REPORTS
# ---------------------------------------------------------------------------
class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.select_related("generated_by").all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Generates a PDF or Excel report based on filters (product/region/date range)."""
        from .reports import build_report  # implement PDF/Excel builder here

        report_format = request.data.get("report_format", "pdf")
        filters = request.data.get("filters", {})
        title = request.data.get("title", "Demand Forecast Report")

        file_path = build_report(report_format=report_format, filters=filters)
        report = Report.objects.create(
            title=title,
            report_format=report_format,
            generated_by=request.user,
            file_path=file_path,
            filters=filters,
        )
        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------------------------
class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models.functions import TruncMonth

        today = timezone.now().date()
        last_30 = today - timedelta(days=30)
        last_12_months = today - timedelta(days=365)

        sales_qs = Sale.objects.filter(sales_date__gte=last_30)
        total_sales = sales_qs.aggregate(total=Sum(F("quantity_sold") * F("unit_price")))["total"] or 0
        total_units = sales_qs.aggregate(total=Sum("quantity_sold"))["total"] or 0
        active_products = Product.objects.filter(is_active=True).count()

        active_model = ForecastModel.objects.filter(is_active=True).order_by("-trained_on").first()
        avg_accuracy = active_model.accuracy_pct if active_model else None

        # ---- Monthly demand trend: actual sales vs forecast (last 12 months + forward forecasts) ----
        monthly_actual = (
            Sale.objects.filter(sales_date__gte=last_12_months)
            .annotate(month=TruncMonth("sales_date"))
            .values("month")
            .annotate(actual=Sum("quantity_sold"))
            .order_by("month")
        )
        monthly_forecast = (
            Forecast.objects.filter(forecast_date__gte=last_12_months)
            .annotate(month=TruncMonth("forecast_date"))
            .values("month")
            .annotate(forecast=Sum("predicted_demand"))
            .order_by("month")
        )
        trend_map = {}
        for row in monthly_actual:
            key = row["month"].strftime("%b %Y")
            trend_map[key] = {"month": key, "actual": float(row["actual"] or 0), "forecast": None}
        for row in monthly_forecast:
            key = row["month"].strftime("%b %Y")
            trend_map.setdefault(key, {"month": key, "actual": None, "forecast": None})
            trend_map[key]["forecast"] = float(row["forecast"] or 0)
        demand_trend = sorted(trend_map.values(), key=lambda r: r["month"])

        # ---- Regional performance ----
        regional_performance = (
            sales_qs.values("region__name")
            .annotate(total_qty=Sum("quantity_sold"), total_rev=Sum(F("quantity_sold") * F("unit_price")))
            .order_by("-total_rev")
        )

        # ---- Top products by units sold (last 30 days) ----
        top_products = (
            sales_qs.values("product__name")
            .annotate(units=Sum("quantity_sold"))
            .order_by("-units")[:5]
        )
        top_products = [{"name": p["product__name"], "units": p["units"]} for p in top_products]

        recent_recommendations = Recommendation.objects.select_related("product", "region").order_by(
            "-created_at"
        )[:10]

        # ---- Model error stats (from active model + recent forecast deviations) ----
        mape = None
        bias = None
        if active_model and active_model.mae is not None:
            recent_avg_qty = sales_qs.aggregate(avg=Avg("quantity_sold"))["avg"] or 0
            mape = (active_model.mae / recent_avg_qty * 100) if recent_avg_qty else None

        evaluated = Forecast.objects.filter(actual_demand__isnull=False)
        if evaluated.exists():
            deviations = [f.deviation_pct for f in evaluated if f.deviation_pct is not None]
            if deviations:
                bias = sum(deviations) / len(deviations)

        data = {
            "total_sales": total_sales,
            "total_units_sold": total_units,
            "active_products": active_products,
            "forecast_accuracy_pct": avg_accuracy,
            "demand_trend": demand_trend,
            "regional_performance": list(regional_performance),
            "top_products": top_products,
            "recent_recommendations": RecommendationSerializer(recent_recommendations, many=True).data,
            "mape": mape,
            "rmse": active_model.rmse if active_model else None,
            "bias": bias,
        }
        return Response(data)