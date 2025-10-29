// Simple test to verify Gemini API connection
// Run this in browser console to test your API key

async function testGeminiAPI() {
  const apiKey = 'AIzaSyDevPHeo5ys7_It67y4OgYnNCEE8kFDDbw'; // Your API key
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: "Say 'Hello, I am working!' in a simple response."
          }
        ]
      }
    ]
  };

  try {
    console.log('Testing API connection...');
    
    const response = await fetch(`${baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Generated text:', text);
    
  } catch (error) {
    console.error('Connection error:', error);
  }
}

// Uncomment to run test:
// testGeminiAPI();