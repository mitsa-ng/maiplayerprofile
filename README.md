---
title: Maiplayerprofile
emoji: 🦀
colorFrom: blue
colorTo: red
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: false
short_description: picture generator
---

# Maiplayerprofile

A small Gradio web app that generates a custom **Maimai player profile card** using local image assets.

## 🚀 Features

- Generate a player card image from user inputs (nickname, title, rating, ranks, and more)
- Browse included asset libraries (character, icon, frame, plate)
- Copy asset IDs for easy customization

## ▶️ Run locally

1. Create a virtual environment (recommended):

```bash
python -m venv .venv
```

2. Activate the virtual environment:

- Windows (PowerShell):
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
- Windows (cmd.exe):
  ```cmd
  .\.venv\Scripts\activate.bat
  ```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Start the app:

```bash
python app.py
```

Then open the local Gradio URL shown in your terminal.

## 📁 Project structure

- `app.py` – Gradio UI and main app logic
- `main.py` – card generation logic (image composition)
- `res/images/` – asset folders (Chara, Icon, Frame, Plate, etc.)

## 🧩 Customizing assets

Update or add `.png` assets inside `res/images/<Category>/`. Asset IDs are derived from file names (trimmed of the `UI_` prefix).

## 📝 Notes

- This project is intended to be run locally.
- Keep `res/images/` assets in place to ensure the gallery works properly.
