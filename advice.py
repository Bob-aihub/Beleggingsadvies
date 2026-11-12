"""Adviesmodule: regelgebaseerde signalen en AI-toelichting via Mistral."""

import os

import pandas as pd
import requests

MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
MISTRAL_MODEL = "mistral-small-latest"

DISCLAIMER = (
    "Dit dashboard is een hulpmiddel voor eigen inzicht en geeft geen financieel advies. "
    "Signalen zijn gebaseerd op vaste regels en openbare koersdata; beslissingen blijven voor eigen rekening."
)


def regel_signalen(pf: pd.DataFrame) -> list[dict]:
    """Genereer regelgebaseerde signalen op basis van de portefeuille."""
    signalen = []
    if pf.empty:
        return signalen

    totaal = pf["waarde"].sum()

    for _, p in pf.iterrows():
        gewicht = p["gewicht"]
        if gewicht >= 20:
            signalen.append(
                {
                    "niveau": "waarschuwing",
                    "titel": f"Concentratierisico: {p['ticker']} is {gewicht:.0f}% van je portefeuille",
                    "tekst": (
                        f"Eén positie boven de 20% maakt je resultaat sterk afhankelijk van één aandeel. "
                        f"Overweeg deze positie geleidelijk te verkleinen richting je doelgewicht."
                    ),
                }
            )

        if p["resultaat_pct"] <= -15:
            signalen.append(
                {
                    "niveau": "waarschuwing",
                    "titel": f"{p['ticker']} staat {p['resultaat_pct']:.0f}% onder je aankoopkoers",
                    "tekst": (
                        "Beoordeel of de oorspronkelijke reden om te kopen nog staat. "
                        "Zo ja, dan is bijpoten een optie; zo nee, dan is lossen geen zwakte."
                    ),
                }
            )

        if p["resultaat_pct"] >= 25:
            signalen.append(
                {
                    "niveau": "info",
                    "titel": f"{p['ticker']} heeft {p['resultaat_pct']:.0f}% winst",
                    "tekst": (
                        "Een flinke winst is een moment om het aandeel in je portefeuille te herwegen: "
                        "is het gewicht nog passend bij je doelverdeling?"
                    ),
                }
            )

        if abs(p["dagmutatie_pct"]) >= 3:
            richting = "gestegen" if p["dagmutatie_pct"] > 0 else "gedaald"
            signalen.append(
                {
                    "niveau": "info",
                    "titel": f"{p['ticker']} vandaag {richting} {abs(p['dagmutatie_pct']):.1f}%",
                    "tekst": "Een forse dagbeweging: check het nieuws rond dit fonds voordat je handelt.",
                }
            )

        doel = p.get("doelgewicht") or 0
        if doel > 0:
            afwijking = gewicht - doel
            if abs(afwijking) >= 10:
                richting = "boven" if afwijking > 0 else "onder"
                signalen.append(
                    {
                        "niveau": "tip",
                        "titel": f"{p['ticker']} wijkt {abs(afwijking):.0f}% af van doelgewicht",
                        "tekst": (
                            f"Huidig gewicht {gewicht:.0f}% ligt {richting} je doel van {doel:.0f}%. "
                            f"Herbalanceren (bijsturen met nieuwe inleg of verkopen) brengt de verdeling terug."
                        ),
                    }
                )

    if len(pf) < 5:
        signalen.append(
            {
                "niveau": "tip",
                "titel": f"Je hebt {len(pf)} posities — beperkte spreiding",
                "tekst": (
                    "Met minder dan vijf posities is de portefeuille gevoelig voor individueel nieuws. "
                    "Een brede wereldwijde ETF kan de basis spreiding goedkoop invullen."
                ),
            }
        )

    if (pf["dagmutatie_pct"] * pf["gewicht"]).sum() <= -2.0:
        signalen.append(
            {
                "niveau": "info",
                "titel": "Portefeuille vandaag duidelijk in de min",
                "tekst": "Dagbewegingen zijn ruis op de lange termijn; alleen handelen als er een goede reden is.",
            }
        )

    return signalen


def _portefeuille_samenvatting(pf: pd.DataFrame) -> str:
    totaal = pf["waarde"].sum()
    kostprijs = pf["kostprijs"].sum()
    resultaat = totaal - kostprijs
    dag = (pf["dagmutatie_pct"] * pf["gewicht"]).sum() / 100 * totaal
    regels = [
        f"- {p['ticker']} ({p['naam']}): {p['aantal']:.0f} stuks, waarde {p['waarde']:.2f} EUR "
        f"({p['gewicht']:.1f}% gewicht), rendement {p['resultaat_pct']:+.1f}%, dagmutatie {p['dagmutatie_pct']:+.1f}%"
        for _, p in pf.iterrows()
    ]
    return (
        f"Totale waarde: {totaal:.2f} EUR. Geïnvesteerd: {kostprijs:.2f} EUR. "
        f"Ongeerealiseerd resultaat: {resultaat:+.2f} EUR ({(totaal / kostprijs - 1) * 100:+.1f}%). "
        f"Vandaag: {dag:+.2f} EUR.\nPosities:\n" + "\n".join(regels)
    )


def ai_toelichting(pf: pd.DataFrame, api_key: str) -> str:
    if not api_key:
        raise ValueError("Geen Mistral API-sleutel opgegeven.")
    if pf.empty:
        raise ValueError("Geen posities om te analyseren.")

    prompt = (
        "Je bent een nuchtere Nederlandse beleggingscoach. Geef op basis van onderstaande "
        "portefeuille een korte toelichting (max 250 woorden) in het Nederlands.\n"
        "Structuur: 1) één zin algemene indruk, 2) twee tot drie opvallende punten "
        "(spreiding, risico's, opvallende bewegingen), 3) één concreet aandachtspunt voor deze week.\n"
        "Wees feitelijk en voorzichtig; noem geen specifieke koop- of verkooporders, maar geef "
        "overwegingen. Vermeld onderaan kort dat dit geen financieel advies is.\n\n"
        f"Portefeuille:\n{_portefeuille_samenvatting(pf)}"
    )

    response = requests.post(
        MISTRAL_API_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": MISTRAL_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4,
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


def haal_api_sleutel() -> str:
    return os.environ.get("MISTRAL_API_KEY", "")
