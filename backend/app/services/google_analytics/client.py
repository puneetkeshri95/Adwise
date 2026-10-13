"""Google Analytics Data API client — pulls website analytics."""
from app.core.config import get_settings


class GAClient:
    """Wraps the Google Analytics Data API v1."""

    def __init__(self, property_id: str | None = None, credentials_path: str | None = None):
        settings = get_settings()
        self.property_id = property_id or settings.GA_PROPERTY_ID
        self.credentials_path = credentials_path or settings.GA_CREDENTIALS_JSON
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                from google.analytics.data_v1beta import BetaAnalyticsDataClient
                from google.oauth2 import service_account

                if self.credentials_path:
                    credentials = service_account.Credentials.from_service_account_file(
                        self.credentials_path,
                        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
                    )
                    self._client = BetaAnalyticsDataClient(credentials=credentials)
                else:
                    self._client = BetaAnalyticsDataClient()
            except Exception:
                return None
        return self._client

    async def get_active_users(self, start_date: str = "30daysAgo", end_date: str = "today"):
        """Get active users count from GA."""
        client = self._get_client()
        if not client:
            return {"active_users": 0}

        from google.analytics.data_v1beta.types import (
            RunReportRequest, DateRange, Metric,
        )

        request = RunReportRequest(
            property=f"properties/{self.property_id}",
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            metrics=[Metric(name="activeUsers")],
        )
        response = client.run_report(request)
        total = 0
        for row in response.rows:
            total += int(row.metric_values[0].value)
        return {"active_users": total}

    async def get_page_views_by_source(self, start_date: str = "30daysAgo", end_date: str = "today"):
        """Get page views broken down by traffic source."""
        client = self._get_client()
        if not client:
            return []

        from google.analytics.data_v1beta.types import (
            RunReportRequest, DateRange, Metric, Dimension,
        )

        request = RunReportRequest(
            property=f"properties/{self.property_id}",
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            dimensions=[Dimension(name="sessionSource"), Dimension(name="sessionMedium")],
            metrics=[Metric(name="screenPageViews"), Metric(name="sessions")],
        )
        response = client.run_report(request)
        results = []
        for row in response.rows:
            results.append({
                "source": row.dimension_values[0].value,
                "medium": row.dimension_values[1].value,
                "page_views": int(row.metric_values[0].value),
                "sessions": int(row.metric_values[1].value),
            })
        return results

    async def get_user_journey_events(self, start_date: str = "7daysAgo", end_date: str = "today"):
        """Get event-level data for journey mapping."""
        client = self._get_client()
        if not client:
            return []

        from google.analytics.data_v1beta.types import (
            RunReportRequest, DateRange, Metric, Dimension,
        )

        request = RunReportRequest(
            property=f"properties/{self.property_id}",
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            dimensions=[
                Dimension(name="eventName"),
                Dimension(name="pagePath"),
                Dimension(name="sessionSource"),
            ],
            metrics=[Metric(name="eventCount"), Metric(name="totalUsers")],
        )
        response = client.run_report(request)
        results = []
        for row in response.rows:
            results.append({
                "event_name": row.dimension_values[0].value,
                "page_path": row.dimension_values[1].value,
                "source": row.dimension_values[2].value,
                "event_count": int(row.metric_values[0].value),
                "total_users": int(row.metric_values[1].value),
            })
        return results
