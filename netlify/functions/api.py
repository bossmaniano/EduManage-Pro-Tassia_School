# Netlify Functions handler - imports and wraps the Flask app
import sys
import os

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
