# Final Demo Script - 28 May Private Beta

Last updated: 2026-05-21.

Use this for the 28 May Veridicta rehearsal and private beta demo. Keep the story narrow: Dutch legal research, huurrecht, arbeidsrecht, citations, matters, memos, and uploaded-document legal review.

## 30-second pitch in Dutch

Veridicta is een Nederlandse juridische onderzoeksworkspace voor teams die sneller en controleerbaar willen werken. De assistent beantwoordt alleen binnen de beschikbare Nederlandse bronnen, toont citaties, bewaart de bronlijn bij matters en markeert werk altijd als juristencontrole vereist. Voor deze beta richten we ons op huurrecht en arbeidsrecht, plus het beoordelen van geuploade contractbepalingen als huidige chatcontext.

## 2-minute demo script

1. Start op de landing en zeg: "Dit is de publieke voorkant: helder, Nederlands eerst, met beta-toegang via het formulier."
2. Klik Inloggen en open de dashboardomgeving.
3. Ga naar Assistant en kies de huurrecht demo shortcut: `Wat geldt bij opzegging van huur van woonruimte?`
4. Klik Send. Wijs op de antwoordstructuur en de juridische citaties.
5. Upload de huurclausule en kies de Legal Review Mode vraag.
6. Wijs op `[Contract D1.P1]`, het contractcontextpaneel en de juridische bronlijn.
7. Sla het antwoord op naar Matter.
8. Open Matters, laat de research note, bronlijn en memo flow zien.
9. Wijs op `Lawyer review required`.
10. Sluit af met de refusal demo: `Kun je mijn volledige belastingaangifte doen?` en toon dat Veridicta geen nep-citaties verzint.

## 5-minute demo script

1. Landing
   Open de landing. Benoem dat Veridicta geen algemene chatbot claimt te zijn, maar een gecontroleerde juridische research workspace.

2. Login
   Klik Inloggen. Benoem dat private beta toegang nog gecontroleerd is.

3. Assistant research
   Open Assistant. Gebruik de demo shortcut `Wat geldt bij opzegging van huur van woonruimte?`. Klik Send pas nadat de vraag zichtbaar in het inputveld staat.

4. Citations
   Laat de antwoordsecties zien: korte conclusie, juridisch kader, toepassing, aandachtspunten, bronnen/citaties, praktische vervolgstap en juristencontrole vereist. Open of benoem de rechter bronlijn.

5. Upload clause
   Upload of plak deze huurclausule:

   ```text
   Verhuurder mag de huurovereenkomst op elk moment beëindigen met een opzegtermijn van één maand, zonder opgave van reden.
   ```

6. Legal Review Mode
   Gebruik de document-review vraag:

   ```text
   Beoordeel deze bepaling voor een Nederlandse huurovereenkomst. Welke risico’s zie je?
   ```

7. Contract reference
   Wijs op `[Contract D1.P1]`. Leg uit: "Het contract is gebruikerscontext, geen juridische bron. De juridische regel moet nog uit de wet of jurisprudentie komen."

8. Save to Matter
   Sla een grounded antwoord met citaties op naar Matter.

9. Draft memo
   Open Matters en toon de research note, source trail en memo draft. Benoem dat de memo copy-ready is, maar niet zelfstandig juridisch advies vervangt.

10. Lawyer review
    Wijs op `Lawyer review required`. Zeg: "Dit is bewust ingebouwd. Veridicta helpt voorbereiden, maar vervangt de jurist niet."

11. Refusal
    Gebruik:

    ```text
    Kun je mijn volledige belastingaangifte doen?
    ```

    Toon dat het systeem weigert of insufficient sources teruggeeft en geen fake citations toont.

## Exact demo flow

1. Landing
2. Login
3. Assistant demo shortcut: huurrecht
4. Show citations
5. Upload huur clause
6. Legal Review Mode
7. Show `[Contract D1.P1]`
8. Save to Matter
9. Draft memo
10. Show lawyer review required
11. Refusal demo

## Exact demo questions

```text
Wat geldt bij opzegging van huur van woonruimte?
```

```text
Wanneer is ontslag op staande voet geldig?
```

```text
Wat geldt bij loondoorbetaling tijdens ziekte?
```

```text
Kun je mijn volledige belastingaangifte doen?
```

## Exact demo clauses

Huurrecht:

```text
Verhuurder mag de huurovereenkomst op elk moment beëindigen met een opzegtermijn van één maand, zonder opgave van reden.
```

Arbeidsrecht:

```text
Werkgever kan de arbeidsovereenkomst per direct beëindigen indien werknemer naar oordeel van werkgever onvoldoende functioneert.
```

## What not to claim

- Do not claim Veridicta replaces a lawyer.
- Do not claim full Dutch legal coverage.
- Do not claim it is enterprise-ready.
- Do not claim public self-serve signup is live.
- Do not claim Germany, France, or EU expansion is supported.
- Do not claim uploaded documents are stored permanently.
- Do not claim every legal question can be answered.

## Fallback lines if something fails

- If the live assistant is slow: "Voor de demo gebruiken we nu de eerder gevalideerde flow. Het product is ontworpen om alleen te antwoorden wanneer bronnen sterk genoeg zijn."
- If citations do not appear fast enough: "De kern is dat Veridicta geen antwoord als bruikbaar markeert zonder bronlijn. We gebruiken daarom alleen grounded antwoorden voor matters."
- If upload extraction fails: "Document review is current-chat context. Voor deze beta ondersteunen we tekst uit PDF, DOCX en tekstbestanden, maar OCR en permanente opslag zitten bewust niet in deze versie."
- If lead email fails: "De lead route is lokaal getest. Voor productie moet de geverifieerde Resend bedrijfsafzender nog actief staan."
- If login/session acts up: "De private beta gebruikt gecontroleerde toegang. Publieke self-serve signup is bewust nog niet de claim."
- If asked about unsupported law: "Dat is buiten de huidige wedge. De beta focust op Nederlands huurrecht en arbeidsrecht met controleerbare citaties."
