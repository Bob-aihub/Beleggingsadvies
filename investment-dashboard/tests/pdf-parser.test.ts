import { describe, it, expect } from "vitest";
import { parseSaxoPdfText } from "@/lib/pdf-parser";

const SAMPLE = `
Portefeuille overzicht
Export datum: 01-11-2025
Rekening: 12345678
Beschikbare middelen: 2.450,35 EUR

Naam                                          ISIN           Aantal  Aankoop  Koers    Waarde     Rend.
iShares Core MSCI World UCITS ETF             IE00B4L5Y983   120     78,40    96,15    11.538,00  +22,6%
ASML Holding                                  NL0010273215   8       610,00   705,40   5.643,20   +15,6%
Apple Inc.                                    US0378331005   25      172,50   228,60   5.715,00   +32,5%
Onderliggende waarde                          ISIN
`;

describe("parseSaxoPdfText", () => {
  it("extraheert de exportdatum", () => {
    const result = parseSaxoPdfText(SAMPLE);
    expect(result.exportDate).not.toBeNull();
    const d = new Date(result.exportDate!);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(1);
  });

  it("extraheert de cashpositie", () => {
    const result = parseSaxoPdfText(SAMPLE);
    expect(result.cash).toBeCloseTo(2450.35, 2);
  });

  it("parset drie posities met naam, ISIN en cijfers", () => {
    const result = parseSaxoPdfText(SAMPLE);
    expect(result.positions).toHaveLength(3);
    const asml = result.positions[1];
    expect(asml.name).toContain("ASML");
    expect(asml.isin).toBe("NL0010273215");
    expect(asml.quantity).toBe(8);
    expect(asml.purchasePrice).toBeCloseTo(610, 2);
    expect(asml.currentPrice).toBeCloseTo(705.4, 2);
    expect(asml.marketValue).toBeCloseTo(5643.2, 2);
  });

  it("markeert posities met ontbrekende velden in plaats van ze te verzinnen", () => {
    const text = "Mysterie Fonds\nBE0000000000\n";
    const result = parseSaxoPdfText(text);
    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].quantity).toBeNull();
    expect(result.positions[0].purchasePrice).toBeNull();
    expect(result.positions[0].warnings.length).toBeGreaterThan(0);
  });

  it("slaat koptekstregels over en meldt geen posities bij lege tekst", () => {
    const result = parseSaxoPdfText("Onderliggende waarde ISIN Aantal\n");
    expect(result.positions).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("herkent ETF's op naam", () => {
    const result = parseSaxoPdfText(SAMPLE);
    expect(result.positions[0].isEtf).toBe(true);
    expect(result.positions[1].isEtf).toBe(false);
  });
});
