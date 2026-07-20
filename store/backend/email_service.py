import os
import random
import requests
import base64

import resend

# Resend Configuration
# Fetch API Key from environment variable RESEND_API_KEY
resend.api_key = os.getenv('RESEND_API_KEY', '')
EMAIL_FROM = "Zzenith <support@zzenith.xyz>"

def send_email(to_email, subject, html_content, text_content=""):
    """Send email via Resend API"""
    if not resend.api_key:
        print(f"[ERROR] Resend API key not configured. Set RESEND_API_KEY")
        return False
    
    try:
        print(f"[EMAIL] Sending to {to_email} via Resend...")
        
        params = {
            "from": EMAIL_FROM,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        
        if text_content:
            params["text"] = text_content

        email = resend.Emails.send(params)
        
        print(f"[EMAIL] Sent successfully to {to_email}. ID: {email.get('id')}")
        return True
        
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {str(e)}")
        return False

def generate_verification_code():
    return str(random.randint(100000, 999999))

def send_verification_email(email, username, code):
    html = f"""
    <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0a0a0a;padding:40px;border:1px solid #1a1a1a">
        <h1 style="color:#06b6d4;text-align:center">ZZENITH</h1>
        <h2 style="color:#06b6d4">Welcome, {username}!</h2>
        <p style="color:#999">Your verification code:</p>
        <div style="background:#111;border:2px solid #06b6d4;padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#06b6d4;font-family:monospace">{code}</span>
        </div>
        <p style="color:#666;font-size:14px">Code expires in 15 minutes.</p>
    </div>
    """
    text = f"Welcome {username}! Your verification code is: {code}. Expires in 15 minutes."
    return send_email(email, f"{username}, verify your Zzenith account", html, text)

def send_password_reset_email(email, username, reset_link):
    html = f"""
    <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0a0a0a;padding:40px;border:1px solid #1a1a1a">
        <h1 style="color:#06b6d4">Password Reset</h1>
        <p style="color:#999">Hi {username},</p>
        <p style="color:#ccc">Click below to reset your password:</p>
        <div style="text-align:center;margin:30px 0">
            <a href="{reset_link}" style="background:#06b6d4;color:#000;padding:15px 40px;text-decoration:none;font-weight:bold;border-radius:4px">Reset Password</a>
        </div>
        <p style="color:#666;font-size:12px">Link: {reset_link}</p>
    </div>
    """
    text = f"Hi {username}, reset your password here: {reset_link}"
    return send_email(email, "Reset Your Zzenith Password", html, text)

def send_license_key_email(email, order_id, items, license_keys):
    keys_html = ""
    keys_text = ""
    for i, item in enumerate(items):
        key = license_keys[i] if i < len(license_keys) else "Pending"
        keys_html += f'<tr><td style="padding:15px;color:#fff;border-bottom:1px solid #1a1a1a">{item.get("title","Product")}</td><td style="padding:15px;text-align:right;border-bottom:1px solid #1a1a1a"><code style="background:#06b6d4;color:#000;padding:8px 15px;border-radius:4px;font-weight:bold">{key}</code></td></tr>'
        keys_text += f"{item.get('title','Product')}: {key}\n"
    
    html = f"""
    <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0a0a0a;padding:40px;border:1px solid #1a1a1a">
        <h1 style="color:#06b6d4;text-align:center">ZZENITH</h1>
        <h2 style="color:#06b6d4">✅ Payment Successful!</h2>
        <p style="color:#999">Your license keys:</p>
        <table width="100%" style="background:#111;border-radius:8px;margin:20px 0">{keys_html}</table>
        <p style="color:#666;margin-top:20px">Order #{order_id}</p>
    </div>
    """
    text = f"Payment Successful! Order #{order_id}\n\nYour license keys:\n{keys_text}"
    return send_email(email, f"Your Zzenith Purchase - Order #{order_id}", html, text)
