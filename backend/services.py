import google.generativeai as genai
import os
import json

class GenAIService:
    def __init__(self):
        # Configure Gemini API
        api_key = os.getenv("GEMINI_API_KEY", "dummy_key_for_now")
        genai.configure(api_key=api_key)
        # Using a default text model, gemini-1.5-flash
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def generate_creative(self, context_data: dict, offer: str, channel: str):
        prompt = f"""
        You are a brand-safe marketing assistant.
        Brand tone: energetic, premium, concise.
        Customer context: {context_data}
        Offer: {offer}
        Channel: {channel}
        Constraint: concise, friendly.
        Avoid: sensitive inference, health claims, manipulative urgency.
        
        Generate a JSON object with a single personalized message variant, having keys:
        - "headline"
        - "body"
        - "cta"
        """
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except Exception as e:
            print(f"GenAI failed: {e}")
            return {
                "headline": "Your special offer is here",
                "body": f"We noticed you might like this {offer}. Check it out today!",
                "cta": "Shop Now"
            }
