#!/usr/bin/env python3
"""RR-045 fallback · prerender the approved marketing pages to static HTML.

Captures the fully-rendered React pages from the running preview dev
server (design = the approved RR-032/RR-035 public site, pixel-faithful
because it IS the same DOM+CSS), strips all JavaScript, rewrites links
for the two-domain architecture, and writes a standalone static site to
/app/marketing-site/.

Routes captured:
  /                 -> marketing-site/index.html
  /product/reserve  -> marketing-site/product/reserve/index.html
"""
import re
import shutil
import sys
from pathlib import Path

import json

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ORGANIZATION_JSONLD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "RestoRhythm",
    "url": "https://restorhythm.com",
    "logo": "https://restorhythm.com/icon-192.png",
    "slogan": "Your restaurant in sync.",
}

RESERVE_SOFTWARE_JSONLD = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "RestoRhythm Reserve",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://restorhythm.com/product/reserve",
    "description": (
        "Reserve is RestoRhythm's reservation and guest experience module: "
        "online bookings, real-time availability, floor plans, waitlist, guest "
        "CRM, SMS confirmations and large-party event inquiries — built for "
        "restaurants."
    ),
    "provider": {
        "@type": "Organization",
        "name": "RestoRhythm",
        "url": "https://restorhythm.com",
    },
}

PREVIEW = "https://resto-ops-hub-9.preview.emergentagent.com"
APP = "https://app.restorhythm.com"
APEX = "https://restorhythm.com"
OUT = Path("/app/marketing-site")

ROUTES = [("/", "index.html"), ("/product/reserve", "product/reserve/index.html")]

# Link policy for the static marketing site.
APP_ABSOLUTE = {"/login", "/register", "/dashboard", "/modules/reserve"}


def rewrite_href(href: str, page_ids: set) -> str:
    if not href:
        return href
    if href.startswith(("http://", "https://", "mailto:", "tel:")):
        return href
    if href in APP_ABSOLUTE:
        return f"{APP}{href}"
    if href == "/":
        return "/"
    if href == "/product/reserve":
        return "/product/reserve"
    if href.startswith("/product/"):
        # Pre-launch product pages are NOT part of this deployment.
        return "/#products"
    if href.startswith("/#"):
        anchor = href[1:]  # "#demo"
        return anchor if anchor[1:] in page_ids else f"/{'' if anchor == '#' else anchor}"
    if href.startswith("#"):
        return href if href[1:] in page_ids else f"/{href}"
    if href.startswith("/"):
        # assets stay relative; anything else app-side goes absolute
        if re.match(r"^/(brand|images|assets|favicon|icon-|apple-)", href):
            return href
        return f"{APP}{href}"
    return href


def capture(route: str, pw) -> str:
    page = pw.new_page(viewport={"width": 1920, "height": 800})
    page.goto(f"{PREVIEW}{route}", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2500)  # let reveal animations finish
    # Strip every script tag — the static site ships zero React JS.
    page.evaluate("() => document.querySelectorAll('script').forEach(s => s.remove())")
    html = page.evaluate("() => document.documentElement.outerHTML")
    page.close()
    return html


def postprocess(html: str, route: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    # ids present on this page (for anchor validation)
    page_ids = {el["id"] for el in soup.select("[id]")}

    # Rewrite links per the two-domain policy.
    for a in soup.find_all("a", href=True):
        a["href"] = rewrite_href(a["href"], page_ids)

    # Defensive: remove any leftover script tags, iframes, and the
    # Emergent/PostHog injections (scripts already stripped pre-capture).
    for tag in soup.find_all(["script", "iframe"]):
        tag.decompose()

    # Absolute asset URLs that still point at the preview host -> relative.
    for tag in soup.find_all(src=True):
        if tag["src"].startswith(PREVIEW):
            tag["src"] = tag["src"][len(PREVIEW):]

    # JSON-LD structured data — stripped with the scripts during capture,
    # so re-inject the truthful static blocks per route.
    head = soup.find("head")
    blocks = [ORGANIZATION_JSONLD]
    if route == "/product/reserve":
        blocks.append(RESERVE_SOFTWARE_JSONLD)
    for block in blocks:
        tag = soup.new_tag("script", type="application/ld+json")
        tag.string = json.dumps(block)
        head.append(tag)

    # Ensure the static enhancement script is loaded.
    body = soup.find("body")
    site_js = soup.new_tag("script", src="/assets/site.js", defer=True)
    body.append(site_js)

    return "<!doctype html>\n" + str(soup)


def main() -> int:
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for route, rel in ROUTES:
                raw = capture(route, browser)
                final = postprocess(raw, route)
                dest = OUT / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(final, encoding="utf-8")
                print(f"captured {route} -> {dest} ({len(final)} bytes)")
        finally:
            browser.close()

    # Static assets referenced by the captured pages.
    pub = Path("/app/frontend/public")
    for name in ("brand", "images"):
        shutil.copytree(pub / name, OUT / name, dirs_exist_ok=True)
    for name in ("favicon.ico", "icon-192.png", "apple-touch-icon.png"):
        shutil.copy2(pub / name, OUT / name)
    print("assets copied")
    return 0


if __name__ == "__main__":
    sys.exit(main())
