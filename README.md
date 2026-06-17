# BigQuery Release Notes Explorer

A premium, fast, and responsive web application built with a Python Flask backend and a modern Vanilla HTML/CSS/JavaScript frontend. It fetches, parses, filters, and shares Google Cloud BigQuery release notes in real time.

---

## ⚡ Key Features

*   **📂 Structured Updates Parsing**: Segments daily concatenated release summaries into individual cards categorized by category (e.g. *Feature*, *Announcement*, *Issue*, *Breaking Change*, *Deprecation*).
*   **🔍 Search & Live Filters**: Instantly query release notes by description keywords or filter results by selecting category badges in the sidebar.
*   **📊 Feed Insights Board**: Dynamically monitors statistics of active logs, including total update days, matching records, and item tallies per category.
*   **🐦 Custom Tweet Composer**: Click **Tweet Note** on any update card to open a custom composer modal. It auto-generates custom drafts and tracks character count in real time (using official X rules where URLs count as 23 characters).
*   **🌓 Hybrid Dark/Light Mode**: Variable-driven styling with a persistent configuration saved directly to browser `localStorage`.
*   **🚀 Smart Caching Layer**: Utilizes a server-side in-memory cache with a 5-minute Time-to-Live (TTL) to load feeds instantly, with a force-sync override option.

---

## 🏗️ Technical Stack

*   **Backend Server**: Python (Flask, requests)
*   **Parsing Engine**: BeautifulSoup4 (HTML extraction), feedparser (XML/Atom feed ingestion)
*   **Frontend Client**: Vanilla HTML5, CSS Custom Properties (Variables), Vanilla JavaScript (ES6+)
*   **Iconography**: Embedded inline SVG vector drawings for performance and asset independence

---

## 📂 Project Structure

```text
abdulwaliyi-event-talks-app/
├── app.py                # Flask Backend API & XML parser
├── requirements.txt      # Python package dependencies
├── .gitignore            # Git exclusion rules
├── templates/
│   └── index.html        # Main HTML5 layout
└── static/
    ├── css/
    │   └── style.css     # Theme variables, layouts, animations, and badges
    └── js/
        └── app.js        # Data binding, state, filters, and Tweet composer modal
```

---

## 🚀 Getting Started

Follow these steps to run the application locally on your computer.

### 1. Prerequisites
Ensure you have **Python 3.8+** installed. You can check your version by running:
```bash
python --version
```

### 2. Setup Virtual Environment
Initialize and activate a virtual environment to manage dependencies locally:

**On Windows (Command Prompt / PowerShell)**:
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**On macOS / Linux**:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
Install the required packages using pip:
```bash
pip install -r requirements.txt
```

### 4. Start the Application
Run the Flask server:
```bash
python app.py
```

Open your browser and navigate to:
🔗 **`http://127.0.0.1:5000/`**

---

## 📡 API Endpoints

### `GET /api/release-notes`
Fetches and returns the parsed release notes feed as JSON data.

*   **Parameters**:
    *   `refresh` (optional): Set to `true` to force bypass the local cache and query Google's feed directly.
*   **Sample Response**:
    ```json
    {
      "success": true,
      "source": "fresh",
      "last_updated": 1781686700,
      "data": [
        {
          "id": "tag:google.com,2016:bigquery-release-notes#June_16_2026",
          "date": "June 16, 2026",
          "updated": "2026-06-16T00:00:00-07:00",
          "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_16_2026",
          "updates": [
            {
              "type": "Announcement",
              "html": "<p>Table Explorer behavior is moving...</p>",
              "text": "Table Explorer behavior is moving to the Reference panel..."
            }
          ]
        }
      ]
    }
    ```
