# Beleggingsdashboard

Lokaal draaiend dashboard voor een dagelijkse stavaza van je beleggingen, met regelgebaseerde signalen en een optionele AI-toelichting (Mistral).

## Starten

```bash
pip install -r requirements.txt
streamlit run app.py
```

De app opent automatisch in je browser op `http://localhost:8501`.

## Gebruik

1. **Posities invoeren** — in de zijbalk vul je per positie in:
   - `ticker`: Yahoo Finance-symbool, met beursachtervoegsel voor niet-Amerikaanse fondsen (bijv. `ASML.AS`, `VWRL.AS`, `AAPL`, `TSM`).
   - `naam`: vrije omschrijving.
   - `aantal` en `aankoopkoers` (in euro's, ook als het fonds in een andere valuta noteert).
   - `doelgewicht %` (optioneel): voor herbalancerings­signalen.
   - Klik daarna op **Posities opslaan** (wordt bewaard in `positions.json`).

   Bij een nieuwe installatie is de portefeuille leeg; er wordt geen voorbeelddata getoond. Met **exporteren/importeren** in de zijbalk maak je een JSON-backup of verplaats je je posities tussen je lokale en gehoste versie.
2. **Dagelijks raadplegen** — de startpagina toont totale waarde, dagmutatie, ongeerealiseerd resultaat, de stavaza en grafieken. Koersen worden automatisch opgehaald en 5 minuten gecachd; verversen kan handmatig of automatisch (60 s).
3. **Signalen** — vaste regels voor concentratie (>20% gewicht), grote verlies/winst-posities, dagbewegingen (>3%), afwijking van doelgewicht (≥10%) en spreiding (<5 posities).
4. **AI-toelichting** — vul je Mistral API-sleutel in (of exporteer `MISTRAL_API_KEY`). De sleutel blijft lokaal in de browser­sessie en wordt alleen naar `api.mistral.ai` gestuurd.

## Bestanden

| Bestand | Doel |
| --- | --- |
| `app.py` | Streamlit-interface |
| `portfolio.py` | Posities beheren en koersen ophalen (Yahoo Finance, omrekening naar EUR) |
| `advice.py` | Regelgebaseerde signalen en AI-toelichting via Mistral |
| `positions.json` | Jouw posities (wordt aangemaakt na opslaan) |

## Disclaimer

Dit dashboard is een hulpmiddel voor eigen inzicht en geeft geen financieel advies.
