"""Datalaag: posities beheren en koersen ophalen via Yahoo Finance."""

import json
import time
from pathlib import Path

import pandas as pd
import yfinance as yf

POSITIONS_FILE = Path(__file__).parent / "positions.json"

DEFAULT_POSITIONS = {"positions": []}


def load_positions() -> pd.DataFrame:
    if POSITIONS_FILE.exists():
        data = json.loads(POSITIONS_FILE.read_text(encoding="utf-8"))
    else:
        data = DEFAULT_POSITIONS
    df = pd.DataFrame(data["positions"])
    kolommen = ["ticker", "naam", "aantal", "aankoopkoers", "doelgewicht"]
    if df.empty:
        return pd.DataFrame(
            {
                "ticker": pd.Series(dtype="str"),
                "naam": pd.Series(dtype="str"),
                "aantal": pd.Series(dtype="float"),
                "aankoopkoers": pd.Series(dtype="float"),
                "doelgewicht": pd.Series(dtype="float"),
            }
        )
    for kolom in kolommen:
        if kolom not in df.columns:
            df[kolom] = None
    return df[kolommen]


def save_positions(df: pd.DataFrame) -> None:
    schoon = df.dropna(subset=["ticker"]).copy()
    schoon = schoon[(schoon["aantal"].fillna(0) > 0) & (schoon["aankoopkoers"].fillna(0) > 0)]
    for kolom in ["aantal", "aankoopkoers", "doelgewicht"]:
        schoon[kolom] = pd.to_numeric(schoon[kolom], errors="coerce")
    schoon["naam"] = schoon["naam"].fillna("")
    payload = {"positions": schoon.to_dict(orient="records")}
    POSITIONS_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _wisselkoers(valuta: str) -> tuple[float, str]:
    if valuta in ("EUR", "", None):
        return 1.0, "EUR"
    ticker = f"EUR{valuta}=X"
    hist = yf.Ticker(ticker).history(period="5d")
    if hist.empty:
        return 1.0, valuta
    return float(hist["Close"].iloc[-1]), "EUR"


def _haal_koersen(tickers: list[str]) -> dict:
    """Haal laatste koers, vorige slot, valuta en naam op per ticker."""
    resultaat = {}
    for ticker in tickers:
        t = yf.Ticker(ticker)
        info = {}
        try:
            info = t.get_info()
        except Exception:
            pass
        valuta = info.get("currency", "")
        naam = info.get("shortName", ticker)
        hist = t.history(period="5d")
        if hist.empty or len(hist["Close"].dropna()) == 0:
            resultaat[ticker] = None
            continue
        slot = hist["Close"].dropna()
        laatste = float(slot.iloc[-1])
        vorige = float(slot.iloc[-2]) if len(slot) >= 2 else laatste
        factor, _ = _wisselkoers(valuta)
        resultaat[ticker] = {
            "koers": laatste,
            "vorige_slot": vorige,
            "valuta": valuta or "EUR",
            "koers_eur": laatste * factor,
            "vorige_slot_eur": vorige * factor,
            "naam": naam,
        }
        time.sleep(0.3)
    return resultaat


def haal_portefeuille(df: pd.DataFrame) -> pd.DataFrame:
    """Voeg koersen en waardecijfers toe aan de positietabel."""
    posities = df.dropna(subset=["ticker"]).copy()
    posities = posities[posities["aantal"].fillna(0) > 0]
    if posities.empty:
        return pd.DataFrame()

    koersen = _haal_koersen(list(posities["ticker"]))

    rijen = []
    for _, p in posities.iterrows():
        k = koersen.get(p["ticker"])
        if k is None:
            continue
        aantal = float(p["aantal"])
        aankoop = float(p["aankoopkoers"])
        waarde = aantal * k["koers_eur"]
        kostprijs = aantal * aankoop
        rijen.append(
            {
                "ticker": p["ticker"],
                "naam": k["naam"],
                "aantal": aantal,
                "aankoopkoers": aankoop,
                "koers": k["koers_eur"],
                "valuta": k["valuta"],
                "dagmutatie_pct": (k["koers_eur"] / k["vorige_slot_eur"] - 1) * 100 if k["vorige_slot_eur"] else 0.0,
                "waarde": waarde,
                "kostprijs": kostprijs,
                "resultaat": waarde - kostprijs,
                "resultaat_pct": (waarde / kostprijs - 1) * 100 if kostprijs else 0.0,
                "doelgewicht": float(p.get("doelgewicht") or 0),
            }
        )

    portefeuille = pd.DataFrame(rijen)
    if portefeuille.empty:
        return portefeuille
    totaal = portefeuille["waarde"].sum()
    portefeuille["gewicht"] = portefeuille["waarde"] / totaal * 100 if totaal else 0.0
    return portefeuille
