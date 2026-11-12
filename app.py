"""Beleggingsdashboard — dagelijks overzicht van je portefeuille met signalen en AI-toelichting.

Start: streamlit run app.py
"""

import os
import time
from datetime import datetime

import pandas as pd
import streamlit as st

from advice import DISCLAIMER, ai_toelichting, regel_signalen
from portfolio import haal_portefeuille, load_positions, save_positions

st.set_page_config(page_title="Beleggingsdashboard", page_icon="📈", layout="wide")

KOLOM_CONFIG = {
    "ticker": st.column_config.TextColumn("Ticker", width="small"),
    "naam": st.column_config.TextColumn("Naam", width="medium"),
    "aantal": st.column_config.NumberColumn("Aantal", min_value=0.0, format="%.4g"),
    "aankoopkoers": st.column_config.NumberColumn("Aankoopkoers (EUR)", min_value=0.0, format="%.2f"),
    "doelgewicht": st.column_config.NumberColumn("Doelgewicht %", min_value=0, max_value=100, format="%.0f"),
}


@st.cache_data(ttl=300, show_spinner=False)
def gecachde_koersen(posities: list[dict]) -> pd.DataFrame:
    return haal_portefeuille(pd.DataFrame(posities))


def _api_sleutel() -> str:
    try:
        if "MISTRAL_API_KEY" in st.secrets:
            return st.secrets["MISTRAL_API_KEY"]
    except Exception:
        pass
    return os.environ.get("MISTRAL_API_KEY", "")


def eur(waarde: float) -> str:
    return f"€ {waarde:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def pct(waarde: float) -> str:
    return f"{waarde:+.2f}%"


st.title("📈 Beleggingsdashboard")
st.caption(f"Laatste verversing: {datetime.now().strftime('%H:%M:%S')} — koersen via Yahoo Finance, 5 minuten gecachd.")

met_sidebar = st.sidebar
met_sidebar.header("Posities beheren")
posities_df = load_positions()
bewerkt = met_sidebar.data_editor(
    posities_df,
    num_rows="dynamic",
    use_container_width=True,
    column_config=KOLOM_CONFIG,
    key="posities_editor",
)
if met_sidebar.button("💾 Posities opslaan", use_container_width=True):
    save_positions(bewerkt)
    st.cache_data.clear()
    met_sidebar.success("Posities opgeslagen.")
if met_sidebar.button("🔄 Koersen verversen", use_container_width=True):
    st.cache_data.clear()
if met_sidebar.toggle("Auto-verversing (60 s)", value=False):
    time.sleep(1)
    st.rerun()
met_sidebar.markdown("---")
met_sidebar.caption(DISCLAIMER)

posities = bewerkt.dropna(subset=["ticker"]).copy()
posities = posities[posities["aantal"].fillna(0) > 0]
if posities.empty:
    st.info("Voeg eerst posities toe in de zijbalk (ticker, aantal, aankoopkoers) en klik op opslaan.")
    st.stop()

with st.spinner("Koersen ophalen…"):
    pf = gecachde_koersen(posities.to_dict(orient="records"))

if pf.empty:
    st.error("Kon geen koersen ophalen. Controleer de tickers (bijv. ASML.AS, AAPL, VWRL.AS).")
    st.stop()

totaal = pf["waarde"].sum()
kostprijs = pf["kostprijs"].sum()
resultaat = totaal - kostprijs
resultaat_pct = (totaal / kostprijs - 1) * 100 if kostprijs else 0
dag = (pf["dagmutatie_pct"] * pf["gewicht"]).sum() / 100 * totaal

kol1, kol2, kol3, kol4 = st.columns(4)
kol1.metric("Totale waarde", eur(totaal), eur(dag), delta_color="normal")
kol2.metric("Geïnvesteerd", eur(kostprijs))
kol3.metric("Ongeerealiseerd resultaat", eur(resultaat), f"{resultaat_pct:+.2f}%")
kol4.metric("Aantal posities", str(len(pf)))

st.subheader("Stavaza")
weergave = pf[
    ["ticker", "naam", "aantal", "aankoopkoers", "koers", "dagmutatie_pct", "waarde", "resultaat", "resultaat_pct", "gewicht"]
].copy()
weergave.columns = [
    "Ticker", "Naam", "Aantal", "Aankoopkoers", "Koers (EUR)", "Dag %",
    "Waarde", "Resultaat", "Resultaat %", "Gewicht %",
]
st.dataframe(
    weergave.style.format(
        {
            "Aantal": "{:.4g}",
            "Aankoopkoers": "€ {:.2f}",
            "Koers (EUR)": "€ {:.2f}",
            "Dag %": "{:+.2f}%",
            "Waarde": "€ {:,.2f}",
            "Resultaat": "€ {:+,.2f}",
            "Resultaat %": "{:+.2f}%",
            "Gewicht %": "{:.1f}%",
        },
        thousands=".",
        decimal=",",
    )
    .map(lambda v: "color: #c0392b;" if v < 0 else "color: #1e8449;", subset=["Dag %", "Resultaat", "Resultaat %"]),
    use_container_width=True,
    hide_index=True,
)

grafiek_kol1, grafiek_kol2 = st.columns(2)
with grafiek_kol1:
    st.subheader("Verdeling")
    st.bar_chart(pf.set_index("ticker")["waarde"], height=320)
with grafiek_kol2:
    st.subheader("Resultaat per positie")
    st.bar_chart(pf.set_index("ticker")["resultaat"], height=320)

st.subheader("🎯 Signalen")
signalen = regel_signalen(pf)
if not signalen:
    st.success("Geen opvallende signalen: de portefeuille voldoet aan alle regels.")
else:
    volgorde = {"waarschuwing": 0, "info": 1, "tip": 2}
    for signaal in sorted(signalen, key=lambda s: volgorde[s["niveau"]]):
        if signaal["niveau"] == "waarschuwing":
            st.warning(f"**{signaal['titel']}** — {signaal['tekst']}")
        elif signaal["niveau"] == "info":
            st.info(f"**{signaal['titel']}** — {signaal['tekst']}")
        else:
            st.markdown(f"💡 **{signaal['titel']}** — {signaal['tekst']}")

st.subheader("🤖 AI-toelichting")
api_sleutel = _api_sleutel() or st.session_state.get("mistral_sleutel", "")
if not api_sleutel:
    st.session_state["mistral_sleutel"] = st.text_input(
        "Mistral API-sleutel (of zet MISTRAL_API_KEY in je omgeving)", type="password"
    )
    api_sleutel = st.session_state.get("mistral_sleutel", "")
if st.button("✨ Genereer AI-toelichting", disabled=not api_sleutel):
    with st.spinner("Mistral analyseert je portefeuille…"):
        try:
            st.markdown(ai_toelichting(pf, api_sleutel))
        except Exception as fout:
            st.error(f"AI-toelichting mislukt: {fout}")

st.caption(DISCLAIMER)
