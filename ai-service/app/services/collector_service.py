from __future__ import annotations

import logging
import re

import httpx

from app.core.config import Settings, get_settings
from app.schemas.internal_ai import PlaceCategoryGroup

logger = logging.getLogger(__name__)

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(text: str) -> str:
    cleaned = _HTML_TAG_RE.sub("", text)
    return (
        cleaned.replace("&quot;", '"')
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .strip()
    )


class ExternalPlaceCollector:
    """[F-07] Collects Naver Blog review snippets & TourAPI public event/spot metadata."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    @property
    def _naver_configured(self) -> bool:
        cid = self._settings.naver_client_id.strip()
        csec = self._settings.naver_client_secret.strip()
        return (
            bool(cid)
            and bool(csec)
            and not cid.startswith("your_")
            and not csec.startswith("your_")
        )

    @property
    def _tour_api_configured(self) -> bool:
        key = self._settings.tour_api_service_key.strip()
        return bool(key) and not key.startswith("your_")

    async def collect_place_snippets(
        self,
        *,
        name: str,
        address: str,
        category_group: PlaceCategoryGroup,
    ) -> list[str]:
        snippets: list[str] = []

        if self._naver_configured:
            snippets.extend(await self._fetch_naver_blog_snippets(name, address))

        if self._tour_api_configured and category_group in {
            PlaceCategoryGroup.EXHIBITION,
            PlaceCategoryGroup.PARK,
            PlaceCategoryGroup.ACTIVITY,
        }:
            snippets.extend(await self._fetch_tour_api_snippets(name))

        if not snippets:
            region_hint = " ".join(address.split()[:2]) if address else "서울 핫플"
            snippets.append(
                f"{region_hint}에 위치한 {name} ({category_group.value}) 데이트 방문 스팟."
            )

        return snippets[:6]

    async def _fetch_naver_blog_snippets(
        self, name: str, address: str
    ) -> list[str]:
        region = address.split()[1] if len(address.split()) > 1 else ""
        query = f"{region} {name} 데이트 후기".strip()
        headers = {
            "X-Naver-Client-Id": self._settings.naver_client_id.strip(),
            "X-Naver-Client-Secret": self._settings.naver_client_secret.strip(),
        }
        try:
            async with httpx.AsyncClient(timeout=3.5) as client:
                resp = await client.get(
                    "https://openapi.naver.com/v1/search/blog.json",
                    params={"query": query, "display": 5, "sort": "sim"},
                    headers=headers,
                )
                if resp.status_code != 200:
                    return []
                items = resp.json().get("items", [])
                results: list[str] = []
                for item in items:
                    title = _strip_html(str(item.get("title", "")))
                    desc = _strip_html(str(item.get("description", "")))
                    if title or desc:
                        results.append(f"{title} - {desc}".strip(" -"))
                return results
        except Exception as exc:
            logger.debug("Naver blog snippet collection skipped: %s", exc)
            return []

    async def _fetch_tour_api_snippets(self, name: str) -> list[str]:
        params = {
            "serviceKey": self._settings.tour_api_service_key.strip(),
            "MobileOS": "ETC",
            "MobileApp": "DayT",
            "_type": "json",
            "keyword": name,
            "numOfRows": 3,
            "pageNo": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=3.5) as client:
                resp = await client.get(
                    "https://apis.data.go.kr/B551011/KorService1/searchKeyword1",
                    params=params,
                )
                if resp.status_code != 200:
                    return []
                body = resp.json()
                raw_items = (
                    body.get("response", {})
                    .get("body", {})
                    .get("items", {})
                    .get("item", [])
                )
                if isinstance(raw_items, dict):
                    raw_items = [raw_items]
                results: list[str] = []
                for entry in raw_items:
                    title = str(entry.get("title", "")).strip()
                    addr = str(entry.get("addr1", "")).strip()
                    if title:
                        results.append(f"한국관광공사 등록 명소: {title} ({addr})")
                return results
        except Exception as exc:
            logger.debug("TourAPI snippet collection skipped: %s", exc)
            return []

