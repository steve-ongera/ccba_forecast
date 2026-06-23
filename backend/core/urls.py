from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LoginView, RefreshView, MeView,
    ProductViewSet, RegionViewSet, SaleViewSet,
    WeatherRecordViewSet, HolidayViewSet, EventViewSet,
    ForecastModelViewSet, ForecastViewSet,
    RecommendationViewSet, ReportViewSet,
    DashboardSummaryView,
)

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("regions", RegionViewSet, basename="region")
router.register("sales", SaleViewSet, basename="sale")
router.register("weather", WeatherRecordViewSet, basename="weather")
router.register("holidays", HolidayViewSet, basename="holiday")
router.register("events", EventViewSet, basename="event")
router.register("forecast-models", ForecastModelViewSet, basename="forecastmodel")
router.register("forecasts", ForecastViewSet, basename="forecast")
router.register("recommendations", RecommendationViewSet, basename="recommendation")
router.register("reports", ReportViewSet, basename="report")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", RefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("", include(router.urls)),
]