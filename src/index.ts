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

    // Only accept POST requests to /api/turn_response
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
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
  },
};
