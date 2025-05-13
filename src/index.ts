/**
 * OpenAI SDK Streaming Cloudflare Worker
 * 
 * This worker handles streaming responses from the OpenAI API
 */
import OpenAI from 'openai';
import { MODEL } from '../config/constants';

// Define types for request
interface TurnResponseRequest {
  messages: any[];
  tools?: any[];
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...corsHeaders,
        },
      });
    }
    
    const url = new URL(request.url);
    
    // Handle GET requests with documentation
    if (request.method === 'GET') {
      const html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OpenAI SDK Streaming API</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #2563eb; }
          code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
          pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
          .example { margin: 20px 0; }
          .endpoint { font-weight: bold; color: #2563eb; }
        </style>
      </head>
      <body>
        <h1>OpenAI SDK Streaming API</h1>
        <p>This is a Cloudflare Worker that provides streaming access to OpenAI's API.</p>
        
        <h2>Endpoints</h2>
        <div class="endpoint">/api/turn_response</div>
        <p>Accepts POST requests with messages and optional tools, returning a streaming SSE response from OpenAI.</p>
        
        <h2>Example Usage</h2>
        <div class="example">
          <pre><code>// Example fetch request
const response = await fetch('/api/turn_response', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' }
    ]
  })
});

// Process the SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  // Process the SSE data
  console.log(text);
}</code></pre>
        </div>
        
        <p>For more information, check the <a href="https://github.com/82deutschmark/openai-sdk-streaming" target="_blank">GitHub repository</a>.</p>
      </body>
      </html>`;
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders
        }
      });
    }

    // For POST requests to /api/turn_response
    if (request.method === 'POST') {
      // Continue with API endpoint logic
      if (url.pathname !== '/api/turn_response') {
        return new Response('Not found', { status: 404 });
      }

    try {
      const requestData: TurnResponseRequest = await request.json();
      const { messages, tools } = requestData;

      const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });

      const events = await openai.responses.create({
        model: MODEL, // Using the model from constants
        input: messages,
        tools,
        stream: true,
        parallel_tool_calls: false,
      });

      // Create a ReadableStream that emits SSE data
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of events) {
              // Sending all events to the client
              const data = JSON.stringify({
                event: event.type,
                data: event,
              });
              controller.enqueue(`data: ${data}\n\n`);
            }
            // End of stream
            controller.close();
          } catch (error) {
            console.error("Error in streaming loop:", error);
            controller.error(error);
          }
        },
      });

      // Return the ReadableStream as SSE
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders
        },
      });
    } catch (error) {
      console.error("Error in handler:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
    } // Close the POST if block
    
    // Default handler for any other methods or routes
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    });
  }, // Close the fetch function
}; // Close the export default object
