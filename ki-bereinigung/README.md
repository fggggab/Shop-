# KI-Bereinigung

Automatische Bereinigung eigener Dateien für den Shop, zum Beispiel
Produktfotos, Produkttexte und PDFs.

## So geht's

1. Öffne auf GitHub den Ordner `ki-bereinigung/eingang/`.
2. Klicke auf **Add file → Upload files**, zieh die Dateien hinein und klicke
   auf **Commit changes**.
3. Warte etwa eine Minute. Den Fortschritt siehst du im Tab **Actions** unter
   „KI-Bereinigung“.
4. Die bereinigten Dateien liegen danach in `ki-bereinigung/ausgang/`. Die
   Originale im Eingang werden gelöscht.

## Was entfernt wird

- **Texte** (`.txt`, `.md`, `.html` …): unsichtbare Unicode-Zeichen,
  Sonder-Leerzeichen und ähnliche Steuerzeichen.
- **Bilder** (PNG, JPEG, WebP, AVIF, HEIC, GIF, TIFF …): C2PA-Herkunftsdaten,
  EXIF (Kamera, GPS-Standort), XMP und KI-Metadaten.
- **Dokumente** (PDF, DOCX, XLSX, PPTX, ODT, EPUB): Dokumenteigenschaften und
  KI- bzw. C2PA-Metadaten.
- **Audio und Video** (MP4, MOV, MP3, WAV, FLAC …): Metadaten.

## Was nicht entfernt wird

- **Der Schreibstil.** Lange Gedankenstriche, Floskeln und typische KI-Formulierungen
  bleiben stehen. Das Umschreiben übernimmt der Skill `humanizer` im Chat mit
  Claude; diese Automatik schreibt nichts um.
- **Statistische Text-Wasserzeichen** (zum Beispiel SynthID) und
  **Wasserzeichen in den Bildpixeln.** Sie stecken im Inhalt selbst, nicht in
  den Metadaten.
- Es gibt **keine Garantie**, dass KI-Erkennungsprogramme die Dateien danach
  nicht mehr erkennen.

## Hinweise

- Nur für eigene Inhalte verwenden.
- Das Repository ist auf GitHub gespeichert. Ist es öffentlich, sind
  hochgeladene Dateien für alle sichtbar, auch die Originale in der
  Git-Historie.
- Technik: [`.github/workflows/ki-bereinigung.yml`](../.github/workflows/ki-bereinigung.yml),
  Skripte aus [guillaumemeyer/watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover)
  (MIT) mit festgelegtem Stand.
