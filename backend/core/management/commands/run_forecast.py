from django.core.management.base import BaseCommand

from core.ml.train import train_all_models
from core.ml.predict import generate_forecasts


class Command(BaseCommand):
    help = "Trains demand forecasting models (if needed) and generates forecasts for all products/regions."

    def add_arguments(self, parser):
        parser.add_argument("--train", action="store_true", help="Train Linear/RF/XGBoost models before forecasting.")
        parser.add_argument("--horizon", type=str, default="weekly", choices=["daily", "weekly", "monthly"])
        parser.add_argument("--product-id", type=int, default=None)
        parser.add_argument("--region-id", type=int, default=None)

    def handle(self, *args, **options):
        if options["train"]:
            self.stdout.write("Training models (Linear Regression, Random Forest, XGBoost)...")
            results = train_all_models(
                product_id=options["product_id"], region_id=options["region_id"]
            )
            for r in results:
                marker = " <-- active" if r.get("is_active") else ""
                self.stdout.write(
                    f"  {r['algorithm']}: accuracy={r['accuracy_pct']:.1f}% "
                    f"mae={r['mae']:.2f} rmse={r['rmse']:.2f}{marker}"
                )

        self.stdout.write(f"Generating {options['horizon']} forecasts...")
        result = generate_forecasts(
            product_id=options["product_id"],
            region_id=options["region_id"],
            horizon=options["horizon"],
        )

        if result.get("error"):
            self.stdout.write(self.style.ERROR(result["error"]))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Created {result['created']} forecasts and "
                f"{result['recommendations_created']} recommendations "
                f"for {result['forecast_date']} using {result['model_used']}."
            )
        )