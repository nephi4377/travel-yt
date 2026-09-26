# Research log for worldwide trip planning

Last reviewed: 2026-09-26. Record only project-relevant source facts and design decisions here; do not store user searches, personal data, or large third-party datasets.

## City lookup

- Source: [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api). It supports global location-name searches and returns candidate coordinates and region/country labels. Use it to disambiguate cities; a typed string alone is not a selected destination.
- Limitation: [Open-Meteo terms](https://open-meteo.com/en/terms) say the free API is for non-commercial use, rate-limited, and has no availability guarantee. A public/commercial release needs a suitable licensed provider or self-hosted alternative.
- Decision: keep lookup user-triggered and separate from POI lookup.

## Place discovery

- Source: [OSM tourism tags](https://wiki.openstreetmap.org/wiki/Key:tourism) and [Overpass API guidance](https://wiki.openstreetmap.org/wiki/Overpass_API). OSM features may include categories, names, coordinates and optional access/fee/opening tags. These fields are not uniformly present or verified.
- Limitation: public Overpass instances are shared resources for small projects, can be overloaded, and ask apps to cache and rate-limit requests; their usage policy counts all app users together. Do not use the public endpoint as an unrestricted production search backend.
- Decision: score only evidence the app actually retrieved. The first explainable matching rules cover `自然` with park/viewpoint and `深度` with historic/cultural categories. Do not claim that OSM categories prove a place is romantic, child-friendly, uncrowded, inexpensive, or open on a chosen date.
- Next investigation: user-controlled nearby/name/category search and a bounded query strategy that discovers requested locations without broad scraping; evaluate provider terms before public deployment.
