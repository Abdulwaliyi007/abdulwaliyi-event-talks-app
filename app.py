import time
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_TTL = 300  # 5 minutes

def parse_summary(summary_html):
    if not summary_html:
        return []
    soup = BeautifulSoup(summary_html, 'html.parser')
    
    h3_tags = soup.find_all('h3')
    if not h3_tags:
        html_str = str(soup)
        text_str = soup.get_text().strip()
        return [{
            'type': 'General',
            'html': html_str,
            'text': text_str
        }]
        
    updates = []
    current_type = None
    current_content = []
    
    for child in soup.contents:
        if child.name == 'h3':
            if current_content:
                html_str = ''.join(str(c) for c in current_content)
                text_str = BeautifulSoup(html_str, 'html.parser').get_text().strip()
                if html_str.strip() or text_str.strip():
                    updates.append({
                        'type': current_type if current_type else 'General',
                        'html': html_str,
                        'text': text_str
                    })
            current_type = child.get_text().strip()
            current_content = []
        else:
            current_content.append(child)
            
    if current_content:
        html_str = ''.join(str(c) for c in current_content)
        text_str = BeautifulSoup(html_str, 'html.parser').get_text().strip()
        if html_str.strip() or text_str.strip():
            updates.append({
                'type': current_type if current_type else 'General',
                'html': html_str,
                'text': text_str
            })
            
    return updates

def fetch_and_parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        feed = feedparser.parse(response.content)
        
        parsed_entries = []
        for entry in feed.entries:
            updates = parse_summary(entry.get('summary', ''))
            
            parsed_entries.append({
                'id': entry.get('id', ''),
                'date': entry.get('title', ''),
                'updated': entry.get('updated', ''),
                'link': entry.get('link', ''),
                'updates': updates
            })
            
        return parsed_entries
    except Exception as e:
        print(f"Error fetching feed: {e}")
        raise

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not cache['data'] or (now - cache['last_fetched'] > CACHE_TTL):
        try:
            data = fetch_and_parse_feed()
            cache['data'] = data
            cache['last_fetched'] = now
            return jsonify({
                'success': True,
                'source': 'fresh',
                'last_updated': cache['last_fetched'],
                'data': data
            })
        except Exception as e:
            if cache['data']:
                return jsonify({
                    'success': True,
                    'source': 'cache_fallback',
                    'last_updated': cache['last_fetched'],
                    'error': str(e),
                    'data': cache['data']
                })
            else:
                return jsonify({
                    'success': False,
                    'error': f"Failed to fetch release notes: {str(e)}"
                }), 500
    
    return jsonify({
        'success': True,
        'source': 'cache',
        'last_updated': cache['last_fetched'],
        'data': cache['data']
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
