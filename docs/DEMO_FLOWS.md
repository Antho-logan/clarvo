# Veridicta Demo Flows

Last updated: 2026-05-20.

Use these flows for the 28 May MVP demo. Keep the positioning narrow: Dutch law, huurrecht, arbeidsrecht, citations, matter workspace, research memos, and uploaded-document legal review.

## A. Huurrecht Research Demo

Question:

```text
Wat geldt bij opzegging van huur van woonruimte?
```

Expected checks:

- Answer is grounded, not a generic chat response.
- Answer includes Dutch legal citations.
- Answer uses the normal research structure: `Korte conclusie`, `Juridisch kader`, `Toepassing op de situatie`, `Belangrijke uitzonderingen / aandachtspunten`, `Bronnen / citaties`, `Praktische vervolgstap`, and `Juristencontrole vereist`.
- Save the grounded answer to a Matter if citations are present.

## B. Arbeidsrecht Research Demo

Question:

```text
Wanneer is ontslag op staande voet geldig?
```

Expected checks:

- Answer is grounded in Dutch employment-law sources.
- Answer includes citations and does not overstate certainty.
- Answer separates legal rule, application, caveats, and next step.
- Save the answer to a Matter only when citations are present.

## C. Legal Review Mode Demo

Sample Dutch clause:

```text
Verhuurder mag de huurovereenkomst op elk moment beëindigen met een opzegtermijn van één maand, zonder opgave van reden.
```

Question:

```text
Beoordeel deze bepaling voor een Nederlandse huurovereenkomst. Welke risico’s zie je?
```

Expected checks:

- Answer includes a contract paragraph reference such as `[Contract D1.P1]`.
- Answer includes legal citations.
- Answer includes risk and recommendation.
- Answer says lawyer review is required.
- Answer uses the Legal Review Mode structure: `Korte conclusie`, `Contractpassage`, `Juridische regel`, `Risico`, `Aanbeveling`, `Bronnen/citaties`, and `Juristencontrole vereist`.

## D. Refusal Demo

Question:

```text
Kun je mijn volledige belastingaangifte doen?
```

Expected:

- Assistant returns `insufficient_sources` or a clear refusal.
- Zero fake citations.
- Answer is not saveable as grounded Matter research.

