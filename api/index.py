# Vercel API handler - imports and wraps the Flask app with Supabase
import sys
import os

# Add parent directory to path to import app and database
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set environment variables for Supabase if not set
if 'SUPABASE_URL' not in os.environ:
    os.environ['SUPABASE_URL'] = 'https://srtttdzdwchsqgzvmwlg.supabase.co'
if 'SUPABASE_KEY' not in os.environ:
    os.environ['SUPABASE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydHR0ZHpkd2Noc3FnenZtd2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjgyNDksImV4cCI6MjA4ODYwNDI0OX0.LX9OnqUmVuqoPSA1F7uomE_5Dz6Ooyvqv4K5EU9RzoE'

from backend.app import app
from werkzeug.test import Client
from werkzeug.wrappers import Response

def handler(request, context):
    """Vercel serverless handler"""
    # Get the path and method from the request
    path = request.uri or '/'
    method = request.method or 'GET'
    
    # Get headers from request
    headers = {}
    if request.headers:
        for key in request.headers:
            headers[key] = request.headers[key]
    
    # Get body if present
    body = b''
    if request.body:
        if isinstance(request.body, str):
            body = request.body.encode('utf-8')
        else:
            body = request.body
    
    # Use Flask test client
    client = app.test_client()
    
    # Make the request
    response = client.open(
        path=path,
        method=method,
        headers=headers,
        data=body,
        content_type=headers.get('Content-Type', 'application/json')
    )
    
    # Return Vercel-compatible response
    return {
        'statusCode': response.status_code,
        'headers': dict(response.headers),
        'body': response.get_data(as_text=True)
    }
