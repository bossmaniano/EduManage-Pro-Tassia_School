# Netlify Functions handler - imports and wraps the Flask app with Supabase enabled
import sys
import os

# Enable Supabase
os.environ['USE_SUPABASE'] = 'true'
os.environ['SUPABASE_URL'] = 'https://srtttdzdwchsqgzvmwlg.supabase.co'
os.environ['SUPABASE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydHR0ZHpkd2Noc3FnenZtd2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjgyNDksImV4cCI6MjA4ODYwNDI0OX0.LX9OnqUmVuqoPSA1F7uomE_5Dz6Ooyvqv4K5EU9RzoE'

# Add parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
from werkzeug.test import Client
from werkzeug.wrappers import Response

def handler(event, context):
    """Netlify serverless handler"""
    # Get the path and method from the request
    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    
    # Get headers from request
    headers = event.get('headers', {})
    
    # Get body if present
    body = event.get('body', '')
    if body:
        body = body.encode('utf-8')
    
    # Use Flask test client
    client = app.test_client()
    
    # Make the request
    response = client.open(
        path=path,
        method=method,
        headers=dict(headers),
        data=body,
        content_type=headers.get('Content-Type', 'application/json')
    )
    
    # Return Netlify-compatible response
    return {
        'statusCode': response.status_code,
        'headers': dict(response.headers),
        'body': response.get_data(as_text=True)
    }
