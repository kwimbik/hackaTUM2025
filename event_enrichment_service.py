"""Event enrichment service with Claude Haiku for sports-style commentary."""

from __future__ import annotations

import os
from collections import deque
from flask import Flask, request, jsonify
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)


class EventEnricher:
    """Enriches event data with exciting sports commentary using Claude Haiku."""

    def __init__(self, window_size: int = 5):
        """
        Initialize the event enricher.

        Args:
            window_size: Number of past events to keep in context
        """
        self.window_size = window_size
        self.event_history = deque(maxlen=window_size)
        self.conversation_history = []  # Store conversation turns for Claude

        api_key = os.getenv("CLAUDE_API")
        if not api_key:
            raise ValueError("CLAUDE_API environment variable not set")

        self.client = Anthropic(api_key=api_key)

    def add_event(self, event_data: dict) -> str:
        """
        Add a new event and generate enriched commentary.

        Args:
            event_data: Dict containing event information
                - name: Person's name
                - recent_event: Event type (e.g., "layoff", "marry")
                - current_income: Current income amount
                - family_status: marital status
                - children: number of children
                - year: year of event
                - month: month of event

        Returns:
            Enriched commentary text in sports announcer style
        """
        # Store this event in history
        self.event_history.append(event_data)

        # Build the prompt with past context
        enriched_text = self._generate_commentary(event_data)

        # Store event data in conversation history along with the generated commentary
        event_summary = self._format_single_event(event_data)
        self.conversation_history.append({
            "role": "user",
            "content": event_summary
        })
        self.conversation_history.append({
            "role": "assistant",
            "content": enriched_text
        })

        # Keep conversation history manageable (max 10 turns = 5 events)
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]

        return enriched_text

    def _format_single_event(self, event_data: dict) -> str:
        """Format a single event for the conversation."""
        name = event_data.get('name', 'Person')
        recent_event = event_data.get('recent_event', 'unknown event')
        income = event_data.get('current_income', 0)
        family_status = event_data.get('family_status', 'single')
        children = event_data.get('children', 0)
        year = event_data.get('year', '')
        month = event_data.get('month', '')

        date_str = f"{year}/{month:02d}" if year and month else "Current"

        return f"""EVENT ({date_str}):
Person: {name}
Event: {recent_event}
Income: ${income:,.2f}
Status: {family_status}
Children: {children}

Generate a 2-3 sentence sports commentary for this life event."""

    def _generate_commentary(self, event_data: dict) -> str:
        """Generate sports-style commentary using Claude Haiku."""
        # Build the message list
        messages = []

        # If this is the first event, add a system-like initial instruction
        if not self.conversation_history:
            initial_prompt = """You are a sports commentator that comments on events in peoples' lives.

Guidelines:
- Use excited language in a way that an announcer would hype up the crowd
- Reference past events to build narrative tension and consistency
- Keep it punchy and dramatic - 2-3 sentences MAX
- Focus on the drama and stakes of the situation
- Maintain a consistent voice and style across all your commentaries

You'll receive life events and generate exciting sports-style commentary for them."""

            messages.append({
                "role": "user",
                "content": initial_prompt
            })
            messages.append({
                "role": "assistant",
                "content": "Got it! I'm ready to provide exciting sports commentary on life events. Send me the first event!"
            })

        # Add conversation history so Claude can see its past commentaries
        messages.extend(self.conversation_history)

        # Add the current event
        event_prompt = self._format_single_event(event_data)
        messages.append({
            "role": "user",
            "content": event_prompt
        })

        try:
            message = self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=200,
                messages=messages
            )

            # Extract the text from the response
            return message.content[0].text.strip()

        except Exception as e:
            print(f"Error calling Claude API: {e}")
            # Fallback to original text
            name = event_data.get('name', 'This person')
            recent_event = event_data.get('recent_event', 'unknown event')
            return f"{name} experienced {recent_event}"


# Global enricher instance
enricher = EventEnricher(window_size=5)


@app.route('/enrich', methods=['POST'])
def enrich_event():
    """
    Endpoint to enrich event data with commentary.

    Expects JSON body with event data fields.
    Returns enriched text.
    """
    try:
        event_data = request.json

        if not event_data:
            return jsonify({"error": "No event data provided"}), 400

        enriched_text = enricher.add_event(event_data)

        return jsonify({
            "success": True,
            "enriched_text": enriched_text,
            "original_data": event_data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "event_history_size": len(enricher.event_history),
        "conversation_history_size": len(enricher.conversation_history)
    })


if __name__ == '__main__':
    print("Starting Event Enrichment Service on http://localhost:5002")
    app.run(host='0.0.0.0', port=5002, debug=True)
